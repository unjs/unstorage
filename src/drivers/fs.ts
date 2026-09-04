import { existsSync, promises as fsp, Stats } from "node:fs";
import { resolve, relative, join, isAbsolute, matchesGlob } from "node:path";
import type { FSWatcher, ChokidarOptions } from "chokidar";
import {
  createError,
  createRequiredError,
  type DriverFactory,
  importLib,
  type LibImport,
  type DriverDependencies,
} from "./utils/index.ts";
import {
  readFile,
  writeFile,
  readdirRecursive,
  rmRecursive,
  unlink,
  ensuredir,
  isTmpFile,
} from "./utils/node-fs.ts";

export interface FSStorageOptions {
  base?: string;
  ignore?: string[];
  readOnly?: boolean;
  noClear?: boolean;
  watchOptions?: ChokidarOptions;

  /**
   * Write each item to a temporary file and rename it over the destination, so that concurrent
   * readers never observe a partially written file.
   *
   * Renaming replaces the destination inode. The file mode is preserved, but ownership, ACLs and
   * extended attributes are not, symbolic links are replaced instead of written through, and hard
   * links to the destination stop tracking it. Small writes are also around twice as slow.
   *
   * @default false
   */
  atomic?: boolean;

  /**
   * Optionally provide the [`chokidar`](https://www.npmjs.com/package/chokidar) library
   * to avoid dynamically importing it.
   *
   * Only used by `watch()`.
   */
  lib?: LibImport<typeof import("chokidar")>;
}

const PATH_TRAVERSE_RE = /\.\.:|\.\.$/;

export const DRIVER_DEPENDENCIES: DriverDependencies = {
  lib: { name: "chokidar", version: "^4 || ^5", optional: true },
};

const DRIVER_NAME = "fs";

const driver: DriverFactory<FSStorageOptions> = (userOptions = {}) => {
  if (!userOptions.base) {
    throw createRequiredError(DRIVER_NAME, "base");
  }

  const base = resolve(userOptions.base);

  const ignorePatterns = userOptions.ignore || ["**/node_modules/**", "**/.git/**"];
  const ignore = (path: string) => {
    const relativePath = relative(base, path);
    return ignorePatterns.some((pattern) => {
      if (isAbsolute(pattern)) {
        return path.startsWith(pattern);
      }
      return matchesGlob(relativePath, pattern);
    });
  };

  const r = (key: string) => {
    if (PATH_TRAVERSE_RE.test(key)) {
      throw createError(
        DRIVER_NAME,
        `Invalid key: ${JSON.stringify(key)}. It should not contain .. segments`,
      );
    }
    const resolved = join(base, key.replace(/:/g, "/"));
    return resolved;
  };

  let _watcher: FSWatcher | undefined;
  const _unwatch = async () => {
    if (_watcher) {
      await _watcher.close();
      _watcher = undefined;
    }
  };

  return {
    name: DRIVER_NAME,
    options: userOptions,
    flags: {
      maxDepth: true,
    },
    hasItem(key) {
      return existsSync(r(key));
    },
    getItem(key) {
      return readFile(r(key), "utf8");
    },
    getItemRaw(key) {
      return readFile(r(key));
    },
    async getMeta(key) {
      const { atime, mtime, size, birthtime, ctime } = await fsp
        .stat(r(key))
        .catch(() => ({}) as Stats);
      return { atime, mtime, size, birthtime, ctime };
    },
    setItem(key, value) {
      if (userOptions.readOnly) {
        return;
      }
      return writeFile(r(key), value, "utf8", userOptions.atomic);
    },
    setItemRaw(key, value) {
      if (userOptions.readOnly) {
        return;
      }
      return writeFile(r(key), value, undefined, userOptions.atomic);
    },
    removeItem(key) {
      if (userOptions.readOnly) {
        return;
      }
      return unlink(r(key)) as Promise<void>;
    },
    getKeys(keyBase, topts) {
      return readdirRecursive(r("."), ignore, topts?.maxDepth, keyBase);
    },
    async clear() {
      if (userOptions.readOnly || userOptions.noClear) {
        return;
      }
      await rmRecursive(r("."));
    },
    async dispose() {
      if (_watcher) {
        await _watcher.close();
      }
    },
    async watch(callback) {
      if (_watcher) {
        return _unwatch;
      }
      await ensuredir(base);
      const { watch } = await importLib(
        DRIVER_NAME,
        "chokidar",
        userOptions.lib,
        () => import("chokidar"),
      );
      await new Promise<void>((resolve, reject) => {
        const watchOptions: ChokidarOptions = {
          ignoreInitial: true,
          ...userOptions.watchOptions,
        };
        if (!watchOptions.ignored) {
          watchOptions.ignored = [];
        } else if (Array.isArray(watchOptions.ignored)) {
          watchOptions.ignored = [...watchOptions.ignored];
        } else {
          watchOptions.ignored = [watchOptions.ignored];
        }
        // Never surface in-progress atomic writes as key events.
        watchOptions.ignored.push(ignore, (path: string) => isTmpFile(path));
        _watcher = watch(base, watchOptions)
          .on("ready", () => {
            resolve();
          })
          .on("error", reject)
          .on("all", (eventName, path) => {
            path = relative(base, path);
            if (eventName === "change" || eventName === "add") {
              callback("update", path);
            } else if (eventName === "unlink") {
              callback("remove", path);
            }
          });
      });
      return _unwatch;
    },
  };
};

export default driver;
