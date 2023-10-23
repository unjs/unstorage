import { defineDriver, createError } from "./utils";
import {
  DRIVER_NAME,
  exists,
  getFileObject,
  joinPaths,
  normalizePath,
  readFile,
  readdirRecursive,
  remove,
  removeChildren,
  unlink,
  writeFile,
} from "./utils/opfs-utils";

export interface OPFSStorageOptions {
  /**
   * The filesystem root to use
   * Defaults to the OPFS root at `navigator.storage.getDirectory()`
   */
  fs?: FileSystemDirectoryHandle | Promise<FileSystemDirectoryHandle>;

  /**
   * The base path to use for all operations
   * Defaults to the root directory (empty string)
   */
  base?: string;

  /**
   * A callback to ignore certain files in getKeys()
   */
  ignore?: (path: string) => boolean;
}

let defaultFsHandle: Promise<FileSystemDirectoryHandle> | undefined;
async function getDefaultFs() {
  // Use memoized OPFS handle if available
  if (typeof defaultFsHandle !== "undefined") return defaultFsHandle;

  // If no file system is provided, OPFS needs to be available
  if (typeof globalThis?.navigator?.storage !== "object") {
    throw createError(
      DRIVER_NAME,
      "No filesystem provided and navigator.storage is not available"
    );
  }

  defaultFsHandle = navigator.storage.getDirectory();
  return defaultFsHandle;
}

export default defineDriver<OPFSStorageOptions | undefined>(
  (opts: OPFSStorageOptions = {}) => {
    opts.base = normalizePath(opts.base ?? "");
    const getFs = () => opts.fs ?? getDefaultFs();
    const resolve = (path: string) => joinPaths(opts.base!, path);

    return {
      name: DRIVER_NAME,
      options: opts,
      async hasItem(key) {
        return exists(await getFs(), resolve(key), "file");
      },
      async getItem(key) {
        if (!(await exists(await getFs(), resolve(key), "file"))) return null;
        return readFile(await getFs(), resolve(key), "utf8");
      },
      async getItemRaw(key) {
        if (!(await exists(await getFs(), resolve(key), "file"))) return null;
        return readFile(await getFs(), resolve(key));
      },
      async getMeta(key) {
        const file = await getFileObject(await getFs(), resolve(key));
        if (!file) return null;

        return {
          mtime: new Date(file.lastModified),
          size: file.size,
          type: file.type,
        };
      },
      async setItem(key, value) {
        return writeFile(await getFs(), resolve(key), value);
      },
      async setItemRaw(key, value) {
        return writeFile(await getFs(), resolve(key), value);
      },
      async removeItem(key) {
        return unlink(await getFs(), resolve(key));
      },
      async getKeys() {
        return readdirRecursive(await getFs(), resolve(""), opts.ignore);
      },
      async clear() {
        if (opts.base!.length === 0) {
          // We cannot delete an OPFS root, so we just empty it
          await removeChildren(await getFs(), resolve(""));
        } else {
          await remove(await getFs(), resolve(""));
        }
      },
    };
  }
);
