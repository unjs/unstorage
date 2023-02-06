import { existsSync, promises as fsp } from "fs";
import { resolve, relative, join } from "path";
import { FSWatcher, WatchOptions, watch } from "chokidar";
import { defineDriver } from "./utils";
import {
  readFile,
  writeFile,
  readdirRecursive,
  rmRecursive,
  unlink,
} from "./utils/node-fs";
import anymatch from "anymatch";

export interface FSStorageOptions {
  base?: string;
  ignore?: string[];
  readOnly?: boolean;
  noClear?: boolean;
  watchOptions?: WatchOptions;
}

const PATH_TRAVERSE_RE = /\.\.\:|\.\.$/;

export default defineDriver((opts: FSStorageOptions = {}) => {
  if (!opts.base) {
    throw new Error("base is required");
  }

  if (!opts.ignore) {
    opts.ignore = ["**/node_modules/**", "**/.git/**"];
  }

  opts.base = resolve(opts.base);
  const r = (key: string) => {
    if (PATH_TRAVERSE_RE.test(key)) {
      throw new Error(
        "[unstorage] [fs] Invalid key. It should not contain `..` segments: " +
          key
      );
    }
    const resolved = join(opts.base!, key.replace(/:/g, "/"));
    return resolved;
  };

  let _watcher: FSWatcher;

  return {
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
      const { atime, mtime, size } = await fsp
        .stat(r(key))
        .catch(() => ({ atime: undefined, mtime: undefined, size: undefined }));
      return { atime, mtime, size };
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
    getKeys() {
      return readdirRecursive(r("."), anymatch(opts.ignore || []));
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
    watch(callback) {
      if (_watcher) {
        return;
      }
      return new Promise((resolve, reject) => {
        _watcher = watch(opts.base!, {
          ignoreInitial: true,
          ignored: opts.ignore,
          ...opts.watchOptions,
        })
          .on("ready", () => {
            resolve(() => _watcher.close().then(() => (_watcher = undefined)));
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
    },
  };
});
