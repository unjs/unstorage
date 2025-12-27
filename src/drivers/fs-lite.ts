import { existsSync, promises as fsp, Stats } from "node:fs";
import { resolve, join } from "node:path";
import {
  createError,
  createRequiredError,
  defineDriver,
} from "./utils/index.ts";
import type { DriverFactory } from "./utils/index.ts";
import {
  readFile,
  writeFile,
  readdirRecursive,
  rmRecursive,
  unlink,
} from "./utils/node-fs.ts";

export interface FSStorageOptions {
  base?: string;
  ignore?: (path: string) => boolean;
  readOnly?: boolean;
  noClear?: boolean;
}

const PATH_TRAVERSE_RE = /\.\.:|\.\.$/;

const DRIVER_NAME = "fs-lite";

const driver: DriverFactory<FSStorageOptions, never> = defineDriver(
  (opts: FSStorageOptions = {}) => {
    if (!opts.base) {
      throw createRequiredError(DRIVER_NAME, "base");
    }

    opts.base = resolve(opts.base);
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
        return readdirRecursive(r("."), opts.ignore, topts?.maxDepth);
      },
      async clear() {
        if (opts.readOnly || opts.noClear) {
          return;
        }
        await rmRecursive(r("."));
      },
    };
  }
);

export default driver;
