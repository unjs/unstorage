import { existsSync, promises as fsp, Stats } from "node:fs";
import { resolve, relative, join } from "node:path";
import { FSWatcher, type ChokidarOptions, watch } from "chokidar";
import anymatch from "anymatch";
import { createError, createRequiredError, defineDriver } from "./utils";
import {
  readFile,
  writeFile,
  readdirRecursive,
  rmRecursive,
  unlink,
} from "./utils/node-fs";

export interface FSStorageOptions {
  base?: string;
  ignore?: string[];
  readOnly?: boolean;
  noClear?: boolean;
  watchOptions?: ChokidarOptions;
}

const PATH_TRAVERSE_RE = /\.\.:|\.\.$/;

const DRIVER_NAME = "fs";

export default defineDriver((opts: FSStorageOptions = {}) => {
  if (!opts.base) {
    throw createRequiredError(DRIVER_NAME, "base");
  }

  // Clone and apply defaults
  const watchOptions: ChokidarOptions = {
    ignoreInitial: true,
    ...opts.watchOptions,
  };
  opts = {
    ...opts,
    base: resolve(opts.base),
    ignore: opts.ignore || ["**/node_modules/**", "**/.git/**"],
    watchOptions,
  };

  // Ignore patterns
  if (!watchOptions.ignored) {
    watchOptions.ignored = [];
  } else if (Array.isArray(watchOptions.ignored)) {
    watchOptions.ignored = [...watchOptions.ignored];
  } else {
    watchOptions.ignored = [watchOptions.ignored];
  }
  watchOptions.ignored.push(anymatch(opts.ignore!));

  const r = (key: string) => {
    if (PATH_TRAVERSE_RE.test(key)) {
      throw createError(
        DRIVER_NAME,
        `Invalid key: ${JSON.stringify(key)}. It should not contain .. segments`
      );
    }
    const resolved = join(opts.base!, key.replace(/:/g, "/"));
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
    options: opts,
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
      if (opts.readOnly) {
        return;
      }
      return writeFile(r(key), value, "utf8");
    },
    setItemRaw(key, value) {
      if (opts.readOnly) {
        return;
      }
      return writeFile(r(key), value);
    },
    removeItem(key) {
      if (opts.readOnly) {
        return;
      }
      return unlink(r(key));
    },
    getKeys(_base, topts) {
      return readdirRecursive(
        r("."),
        anymatch(opts.ignore || []),
        topts?.maxDepth
      );
    },
    async clear() {
      if (opts.readOnly || opts.noClear) {
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
      await new Promise<void>((resolve, reject) => {
        _watcher = watch(opts.base!, watchOptions)
          .on("ready", () => {
            resolve();
          })
          .on("error", reject)
          .on("all", (eventName, path) => {
            path = relative(opts.base!, path);
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
});
