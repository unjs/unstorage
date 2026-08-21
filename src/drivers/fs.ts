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
  writeFileExclusive,
  readdirRecursive,
  rmRecursive,
  unlink,
  ensuredir,
  isTmpFile,
} from "./utils/node-fs.ts";
import { CASMismatchError, checkCAS } from "./utils/cas.ts";

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

  // Per-key in-process write serialization for non-O_EXCL CAS paths.
  // POSIX has no portable file-CAS primitive; this protects against races
  // within a single process. Cross-process correctness for `ifMatch` is not
  // guaranteed — use an external lock or a CAS-native driver for that.
  const writeLocks = new Map<string, Promise<void>>();
  const withLock = async <T>(key: string, fn: () => Promise<T>): Promise<T> => {
    const previous = writeLocks.get(key) || Promise.resolve();
    let release!: () => void;
    const next = new Promise<void>((r) => {
      release = r;
    });
    const chained = previous.then(() => next);
    writeLocks.set(key, chained);
    await previous;
    try {
      return await fn();
    } finally {
      release();
      if (writeLocks.get(key) === chained) {
        writeLocks.delete(key);
      }
    }
  };

  let _watcher: FSWatcher | undefined;
  const _unwatch = async () => {
    if (_watcher) {
      await _watcher.close();
      _watcher = undefined;
    }
  };

  const writeWithCAS = async (
    key: string,
    plainWrite: (path: string) => Promise<void>,
    exclusiveWrite: (path: string) => Promise<void>,
    opts: { ifMatch?: string; ifNoneMatch?: string } | undefined,
  ): Promise<{ etag: string } | undefined> => {
    const path = r(key);
    const wantsCAS = !!(opts && (opts.ifMatch !== undefined || opts.ifNoneMatch !== undefined));

    if (!wantsCAS) {
      await plainWrite(path);
      return undefined;
    }

    // Atomic create-only via `link()`; correct across processes.
    if (opts!.ifNoneMatch === "*" && opts!.ifMatch === undefined) {
      try {
        await exclusiveWrite(path);
      } catch (err: any) {
        if (err?.code === "EEXIST") {
          throw new CASMismatchError(DRIVER_NAME, key);
        }
        throw err;
      }
      const stats = await fsp.stat(path);
      return { etag: statEtag(stats) };
    }

    // Etag-based CAS: best-effort, single-process. POSIX has no portable
    // file-CAS primitive; cross-process callers should layer an external lock.
    return withLock(path, async () => {
      const stats = await fsp.stat(path).catch(() => null);
      const prevEtag = stats ? statEtag(stats) : undefined;
      checkCAS(DRIVER_NAME, key, { exists: !!stats, etag: prevEtag }, opts!);
      await plainWrite(path);
      return { etag: await distinctEtag(path, prevEtag) };
    });
  };

  return {
    name: DRIVER_NAME,
    options: userOptions,
    flags: {
      maxDepth: true,
      cas: true,
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
      const stats = await fsp.stat(r(key)).catch(() => ({}) as Stats);
      const { atime, mtime, size, birthtime, ctime } = stats;
      const etag = stats && stats.mtimeMs ? statEtag(stats) : undefined;
      return { atime, mtime, size, birthtime, ctime, etag };
    },
    async setItem(key, value, opts) {
      if (userOptions.readOnly) {
        return;
      }
      return writeWithCAS(
        key,
        (path) => writeFile(path, value, "utf8", userOptions.atomic),
        (path) => writeFileExclusive(path, value, "utf8"),
        opts,
      );
    },
    async setItemRaw(key, value, opts) {
      if (userOptions.readOnly) {
        return;
      }
      return writeWithCAS(
        key,
        (path) => writeFile(path, value, undefined, userOptions.atomic),
        (path) => writeFileExclusive(path, value),
        opts,
      );
    },
    removeItem(key) {
      if (userOptions.readOnly) {
        return;
      }
      return unlink(r(key)) as Promise<void>;
    },
    getKeys(_base, topts) {
      return readdirRecursive(r("."), ignore, topts?.maxDepth);
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

function statEtag(stats: { mtimeMs: number; size: number; ino: number }): string {
  return `${stats.mtimeMs.toString(16)}-${stats.size.toString(16)}-${stats.ino.toString(16)}`;
}

// The etag is derived from (mtime, size, ino), and filesystem timestamp
// granularity can be coarser than the gap between two writes. A same-size
// overwrite can therefore land on the exact triple it replaced, which would
// let a stale `ifMatch` succeed. Nudge mtime forward until the etag actually
// differs, doubling the step so filesystems with second-level granularity
// converge too.
async function distinctEtag(path: string, prevEtag: string | undefined): Promise<string> {
  let stats = await fsp.stat(path);
  let etag = statEtag(stats);
  for (let step = 1; etag === prevEtag && step <= 4096; step *= 2) {
    await fsp.utimes(path, stats.atime, new Date(stats.mtimeMs + step));
    stats = await fsp.stat(path);
    etag = statEtag(stats);
  }
  return etag;
}

export default driver;
