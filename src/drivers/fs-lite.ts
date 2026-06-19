import { existsSync, promises as fsp, Stats } from "node:fs";
import { resolve, join } from "node:path";
import { createError, createRequiredError, type DriverFactory } from "./utils/index.ts";
import { readFile, writeFile, readdirRecursive, rmRecursive, unlink } from "./utils/node-fs.ts";

export interface FSStorageOptions {
  base?: string;
  ignore?: (path: string) => boolean;
  readOnly?: boolean;
  noClear?: boolean;
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

const DRIVER_NAME = "fs-lite";

const driver: DriverFactory<FSStorageOptions> = (opts = {}) => {
  if (!opts.base) {
    throw createRequiredError(DRIVER_NAME, "base");
  }

  opts.base = resolve(opts.base);
  const dataSuffix = opts.dataSuffix;

  // `dataSuffix` is appended to leaf filenames, so it must not introduce path
  // separators (which would create nesting) or the ":" key separator (which
  // would break the round-trip in getKeys/watch). Reject those up front.
  if (
    dataSuffix !== undefined &&
    (typeof dataSuffix !== "string" ||
      dataSuffix.length === 0 ||
      dataSuffix === "." ||
      dataSuffix === ".." ||
      /[/\\:]/.test(dataSuffix))
  ) {
    throw createError(
      DRIVER_NAME,
      `Invalid dataSuffix: ${JSON.stringify(dataSuffix)}. It must be a non-empty string other than "." or ".." and must not contain "/", "\\" or ":".`,
    );
  }

  const r = (key: string) => {
    if (PATH_TRAVERSE_RE.test(key)) {
      throw createError(
        DRIVER_NAME,
        `Invalid key: ${JSON.stringify(key)}. It should not contain .. segments`,
      );
    }
    const resolved = join(opts.base!, key.replace(/:/g, "/"));
    return resolved;
  };

  const rFile = (key: string) => {
    const resolved = r(key);
    if (!dataSuffix) {
      return resolved;
    }
    // A root/empty key resolves to `base` itself; `base + suffix` would write a
    // sibling *outside* base. Keep the suffixed file inside base instead.
    return resolved === opts.base
      ? join(opts.base!, dataSuffix)
      : resolved + dataSuffix;
  };

  return {
    name: DRIVER_NAME,
    options: opts,
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
      if (opts.readOnly) {
        return;
      }
      return writeFile(rFile(key), value, "utf8");
    },
    setItemRaw(key, value) {
      if (opts.readOnly) {
        return;
      }
      return writeFile(rFile(key), value);
    },
    removeItem(key) {
      if (opts.readOnly) {
        return;
      }
      return unlink(rFile(key)) as Promise<void>;
    },
    async getKeys(_base, topts) {
      const keys = await readdirRecursive(r("."), opts.ignore, topts?.maxDepth);
      if (dataSuffix) {
        return keys
          .filter((key) => key.endsWith(dataSuffix))
          .map((key) => key.slice(0, -dataSuffix.length));
      }
      return keys;
    },
    async clear() {
      if (opts.readOnly || opts.noClear) {
        return;
      }
      await rmRecursive(r("."));
    },
  };
};

export default driver;
