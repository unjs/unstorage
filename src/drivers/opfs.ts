import { defineDriver } from "./utils";
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

export default defineDriver<OPFSStorageOptions | undefined>(
  (opts: OPFSStorageOptions = {}) => {
    const fsPromise = Promise.resolve(
      opts.fs ?? navigator.storage.getDirectory()
    );

    opts.base = normalizePath(opts.base ?? "");

    const resolve = (path: string) => joinPaths(opts.base!, path);

    return {
      name: DRIVER_NAME,
      options: opts,
      async hasItem(key) {
        return exists(await fsPromise, resolve(key), "file");
      },
      async getItem(key) {
        if (!(await exists(await fsPromise, resolve(key), "file"))) return null;
        return readFile(await fsPromise, resolve(key), "utf8");
      },
      async getItemRaw(key) {
        if (!(await exists(await fsPromise, resolve(key), "file"))) return null;
        return readFile(await fsPromise, resolve(key));
      },
      async getMeta(key) {
        const file = await getFileObject(await fsPromise, resolve(key));
        if (!file) return null;

        return {
          mtime: new Date(file.lastModified),
          size: file.size,
          type: file.type,
        };
      },
      async setItem(key, value) {
        return writeFile(await fsPromise, resolve(key), value);
      },
      async setItemRaw(key, value) {
        return writeFile(await fsPromise, resolve(key), value);
      },
      async removeItem(key) {
        return unlink(await fsPromise, resolve(key));
      },
      async getKeys() {
        return readdirRecursive(await fsPromise, resolve(""), opts.ignore);
      },
      async clear() {
        if (opts.base!.length === 0) {
          // We cannot delete an OPFS root, so we just empty it
          await removeChildren(await fsPromise, resolve(""));
        } else {
          await remove(await fsPromise, resolve(""));
        }
      },
    };
  }
);
