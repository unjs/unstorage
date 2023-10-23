import { createError } from ".";

export const DRIVER_NAME = "opfs";

function ignoreNotfoundError(error: any): null {
  if (error.name === "NotFoundError") return null;
  throw error;
}

/**
 * Normalize a path, removing empty segments and leading/trailing slashes
 */
export function normalizePath(path: string): string {
  // Wrap path in slashes, remove . segments and collapse subsequent namespace separators
  const normalizedWrappedPath = `/${path}/`.replace(
    /[/:]+(\.[/:]+)*[/:]*/g,
    "/"
  );

  // Disallow .. segments
  if (normalizedWrappedPath.includes("/../")) {
    throw createError(
      DRIVER_NAME,
      `Invalid key: ${JSON.stringify(path)}. It must not contain .. segments`
    );
  }

  return normalizedWrappedPath.slice(1, -1);
}

/**
 * Join path segments and normalize the result
 * Does not support resolving `.` or `..` segments
 */
export function joinPaths(...segments: string[]): string {
  return normalizePath(segments.join("/"));
}

/**
 * Get the directory name of a path
 */
export function dirname(path: string): string {
  const normalizedPath = normalizePath(path);
  if (!normalizedPath.includes("/")) return "";
  return normalizedPath.slice(0, normalizedPath.lastIndexOf("/"));
}

/**
 * These correspond with the handle's `kind` property
 */
type SpecificHandleType = "file" | "directory";
type UnspecificHandleType = SpecificHandleType | "any";

/**
 * Options for the `getHandle` function
 */
type GetHandleOptions = {
  /**
   * Whether to create the handle if it doesn't exist
   * Setting to `true` requires setting a specific `type`
   *
   * @default false
   */
  create?: boolean;

  /**
   * Which kind of handle is desired ('file', 'directory', or 'any')
   * If a handle of the provided type cannot be obtained, an error will be thrown
   *
   * @default "any"
   */
  type?: UnspecificHandleType;
};

/**
 * This is a special subset of the `GetHandleOptions` type for improved
 * type inference when overloading the `getHandle` function
 *
 * It represents options with the `create` option set to `true`,
 * which requires setting a known `type`
 */
type GetHandleWithCreateOptions<T extends SpecificHandleType> = {
  create: true;
  type: T;
};

/**
 * This is a special subset of the `GetHandleOptions` type for improved
 * type inference when overloading the `getHandle` function
 *
 * It represents options with the `create` option set to false or missing,
 * which allows for a less specific `type` option
 */
type GetHandleWithoutCreateOptions<T extends UnspecificHandleType> = {
  create?: false;
  type?: T;
};

type HandleTypesByName = {
  file: FileSystemFileHandle;
  directory: FileSystemDirectoryHandle;
  any: FileSystemHandle;
};

async function getHandle<T extends SpecificHandleType>(
  root: FileSystemDirectoryHandle,
  path: string | string[],
  opts: GetHandleWithCreateOptions<T>
): Promise<HandleTypesByName[T]>;
async function getHandle<T extends UnspecificHandleType>(
  root: FileSystemDirectoryHandle,
  path: string | string[],
  opts?: GetHandleWithoutCreateOptions<T>
): Promise<HandleTypesByName[T]>;

/**
 * Get a FileSystemHandle for a given path
 *
 * @param root The directory handle to start at
 * @param path The path to the desired handle
 * @param opts Options for obtaining the handle
 */
async function getHandle(
  root: FileSystemDirectoryHandle,
  path: string | string[],
  opts: GetHandleOptions = {}
): Promise<FileSystemHandle> {
  // Split the path
  const segments = Array.isArray(path) ? path : normalizePath(path).split("/");

  // If there are no segments, return the root handle
  if (segments.length === 0) return root;

  const create = Boolean(opts.create);
  const handleType: UnspecificHandleType = opts.type ?? "any";

  // If possibly creating the handle, a specific type must be provided
  if (create && handleType !== "file" && handleType !== "directory") {
    throw createError(
      DRIVER_NAME,
      "Invalid handle type, must be `file` or `directory` when creating"
    );
  }

  // Resolve remaining segments recursively
  if (segments.length > 1) {
    const child = await root.getDirectoryHandle(segments[0], { create: true });
    return getHandle(child, segments.slice(1), {
      create: create as any,
      type: handleType,
    });
  }

  // Get the handle for the last segment

  // If the segment is empty, return the root handle
  if (segments[0].length === 0) {
    if (handleType === "directory" || handleType === "any") {
      return root;
    } else {
      throw createError(
        DRIVER_NAME,
        "Cannot get a file handle for the root directory"
      );
    }
  }

  try {
    if (handleType === "directory") {
      return await root.getDirectoryHandle(segments[0], { create });
    } else if (handleType === "file") {
      return await root.getFileHandle(segments[0], { create });
    } else {
      return await root.getFileHandle(segments[0]);
    }
  } catch (error: any) {
    if (handleType === "any" && error?.name === "TypeMismatchError") {
      return await root.getDirectoryHandle(segments[0]);
    } else {
      throw error;
    }
  }
}

/**
 * Check whether a handle exists at a given path
 */
export async function exists(
  root: FileSystemDirectoryHandle,
  path: string,
  type: UnspecificHandleType = "any"
): Promise<boolean> {
  try {
    await getHandle(root, path, { type });
    return true;
  } catch {
    return false;
  }
}

/**
 * Write to a file at a given path
 * If the file does not exist, it will be created
 */
export async function writeFile(
  root: FileSystemDirectoryHandle,
  path: string,
  data: FileSystemWriteChunkType
): Promise<void> {
  await ensureDirectory(root, dirname(path));
  const handle = await getHandle(root, path, { create: true, type: "file" });

  const writableStream = await handle.createWritable();
  await writableStream.write(data);
  await writableStream.close();
}

/**
 * Get a File object from a given path
 */
export async function getFileObject(
  root: FileSystemDirectoryHandle,
  path: string
): Promise<File | null> {
  const handle = await getHandle(root, path, { type: "file" });
  return await handle.getFile().catch(ignoreNotfoundError);
}

export async function readFile(
  root: FileSystemDirectoryHandle,
  path: string
): Promise<Uint8Array | null>;
export async function readFile(
  root: FileSystemDirectoryHandle,
  path: string,
  encoding: string
): Promise<string | null>;

/**
 * Read a file at a given path
 *
 * @param root The root handle to read from
 * @param path The path to the file to read
 * @param encoding The encoding to use when reading the file. Can be omitted to return an Uint8Array.
 */
export async function readFile(
  root: FileSystemDirectoryHandle,
  path: string,
  encoding?: string
): Promise<ArrayBuffer | string | null> {
  const handle = await getHandle(root, path, { type: "file" });
  let file = await handle.getFile().catch(ignoreNotfoundError);

  if (!file) return null;

  const arrayBuffer = await file.arrayBuffer();
  if (!encoding) return new Uint8Array(arrayBuffer);

  const decoder = new TextDecoder(encoding);
  return decoder.decode(arrayBuffer);
}

/**
 * Get file handles in a given directory
 */
export async function readdir(
  root: FileSystemDirectoryHandle,
  directoryPath: string
): Promise<FileSystemHandle[]> {
  const handle = await getHandle(root, directoryPath, {
    type: "directory",
  }).catch(ignoreNotfoundError);
  if (!handle) return [];

  const entries: FileSystemHandle[] = [];

  for await (const entry of (handle as any).values()) {
    entries.push(entry);
  }

  return entries;
}

/**
 * Ensure that a directory exists at a given path
 * Throws if a file exists at the given path
 */
async function ensureDirectory(
  root: FileSystemDirectoryHandle,
  directoryPath: string
): Promise<void> {
  await getHandle(root, directoryPath, { create: true, type: "directory" });
}

/**
 * Get all file paths in the given directory and its subdirectories
 */
export async function readdirRecursive(
  root: FileSystemDirectoryHandle,
  directoryPath: string,
  ignore?: (path: string) => boolean
): Promise<string[]> {
  if (ignore && ignore(directoryPath)) {
    return [];
  }
  const entries = await readdir(root, directoryPath);
  const files: string[] = [];
  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = joinPaths(directoryPath, entry.name);
      if (entry.kind === "directory") {
        const dirFiles = await readdirRecursive(root, entryPath, ignore);
        files.push(...dirFiles.map((f) => `${entry.name}/${f}`));
      } else {
        if (!ignore?.(entry.name)) {
          files.push(entry.name);
        }
      }
    })
  );
  return files;
}

/**
 * Delete a file
 * Ignores non-existent files, throws if a directory exists at the given path
 */
export async function unlink(
  root: FileSystemDirectoryHandle,
  file: string
): Promise<void> {
  const handle = await getHandle(root, file, { type: "file" }).catch(
    ignoreNotfoundError
  );
  if (!handle) return;
  if (handle.name === "") {
    throw createError(DRIVER_NAME, "Cannot delete root directory");
  }
  const parentDirectoryHandle = await getHandle(root, dirname(file), {
    type: "directory",
  });
  await parentDirectoryHandle.removeEntry(handle.name);
}

/**
 * Remove contents from a directory without deleting the directory itself
 */
export async function removeChildren(
  root: FileSystemDirectoryHandle,
  directoryPath: string
): Promise<void> {
  const handle = await getHandle(root, directoryPath, {
    type: "directory",
  }).catch(ignoreNotfoundError);
  if (!handle) return;

  const files = await readdir(handle, "");
  await Promise.all(
    files.map((file) => handle.removeEntry(file.name, { recursive: true }))
  );
}

/**
 * Remove a file or directory with all of its contents
 */
export async function remove(
  root: FileSystemDirectoryHandle,
  path: string
): Promise<void> {
  if (!(await exists(root, path))) return;

  const handle = await getHandle(root, path);
  if (handle.name === "") {
    throw createError(DRIVER_NAME, "Cannot delete root directory");
  }

  const parentDirectoryHandle = await getHandle(root, dirname(path), {
    type: "directory",
  });
  await parentDirectoryHandle.removeEntry(handle.name, {
    recursive: true,
  });
}
