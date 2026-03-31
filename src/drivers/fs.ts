import { existsSync, promises as fsp, Stats } from "node:fs";
import { resolve, relative, join, isAbsolute, matchesGlob } from "node:path";
import type { FSWatcher, ChokidarOptions } from "chokidar";
import { createError, createRequiredError, type DriverFactory } from "./utils/index.ts";
import {
  readFile,
  writeFile,
  readdirRecursive,
  rmRecursive,
  unlink,
  ensuredir,
} from "./utils/node-fs.ts";

export interface FSStorageOptions {
  base?: string;
  ignore?: string[];
  readOnly?: boolean;
  noClear?: boolean;
  watchOptions?: ChokidarOptions;
  /**
   * Suffix appended to all stored file paths on disk.
   *
   * When set (e.g. `".data"`), key `foo` is stored as `foo.data` and
   * key `foo:bar` as `foo/bar.data`.  This prevents file/directory
   * collisions that occur when both `foo` and `foo:bar` exist as keys
   * (the plain key would need `foo` to be both a file *and* a directory).
   */
  dataSuffix?: string;
}

const PATH_TRAVERSE_RE = /\.\.:|\.\.$/;

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

  const dataSuffix = userOptions.dataSuffix;

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

  const rFile = (key: string) => {
    const resolved = r(key);
    return dataSuffix ? resolved + dataSuffix : resolved;
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
      return existsSync(rFile(key));
    },
    getItem(key) {
      return readFile(rFile(key), "utf8");
    },
    getItemRaw(key) {
      return readFile(rFile(key));
    },
    async getMeta(key) {
      const { atime, mtime, size, birthtime, ctime } = await fsp
        .stat(rFile(key))
        .catch(() => ({}) as Stats);
      return { atime, mtime, size, birthtime, ctime };
    },
    setItem(key, value) {
      if (userOptions.readOnly) {
        return;
      }
      return writeFile(rFile(key), value, "utf8");
    },
    setItemRaw(key, value) {
      if (userOptions.readOnly) {
        return;
      }
      return writeFile(rFile(key), value);
    },
    removeItem(key) {
      if (userOptions.readOnly) {
        return;
      }
      return unlink(rFile(key)) as Promise<void>;
    },
    async getKeys(_base, topts) {
      const keys = await readdirRecursive(r("."), ignore, topts?.maxDepth);
      if (dataSuffix) {
        return keys
          .filter((key) => key.endsWith(dataSuffix))
          .map((key) => key.slice(0, -dataSuffix.length));
      }
      return keys;
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
      const { watch } = await import("chokidar");
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
        watchOptions.ignored.push(ignore);
        _watcher = watch(base, watchOptions)
          .on("ready", () => {
            resolve();
          })
          .on("error", reject)
          .on("all", (eventName, path) => {
            path = relative(base, path);
            if (dataSuffix) {
              if (!path.endsWith(dataSuffix)) {
                return; // ignore non-suffixed files
              }
              path = path.slice(0, -dataSuffix.length);
            }
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
