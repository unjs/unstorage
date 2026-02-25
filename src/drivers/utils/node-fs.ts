import { Dirent, existsSync, promises as fsPromises } from "node:fs";
import { resolve, dirname } from "node:path";

function ignoreNotfound(err: any) {
  return err.code === "ENOENT" || err.code === "EISDIR" ? null : err;
}

function ignoreExists(err: any) {
  return err.code === "EEXIST" ? null : err;
}

type WriteFileData = Parameters<typeof fsPromises.writeFile>[1];
export async function writeFile(
  path: string,
  data: WriteFileData,
  encoding?: BufferEncoding
): Promise<void> {
  await ensuredir(dirname(path));
  return fsPromises.writeFile(path, data, encoding);
}

export function readFile(path: string, encoding?: BufferEncoding): Promise<string | Buffer | null> {
  return fsPromises.readFile(path, encoding).catch(ignoreNotfound);
}

export function stat(path: string): Promise<import("node:fs").Stats | null> {
  return fsPromises.stat(path).catch(ignoreNotfound);
}

export function unlink(path: string): Promise<void | null> {
  return fsPromises.unlink(path).catch(ignoreNotfound);
}

export function readdir(dir: string): Promise<Dirent[]> {
  return fsPromises
    .readdir(dir, { withFileTypes: true })
    .catch(ignoreNotfound)
    .then((r) => r || []);
}

export async function ensuredir(dir: string): Promise<void> {
  if (existsSync(dir)) {
    return;
  }
  await ensuredir(dirname(dir)).catch(ignoreExists);
  await fsPromises.mkdir(dir).catch(ignoreExists);
}

export async function readdirRecursive(
  dir: string,
  ignore?: (p: string) => boolean,
  maxDepth?: number
): Promise<string[]> {
  if (ignore && ignore(dir)) {
    return [];
  }
  const entries: Dirent[] = await readdir(dir);
  const files: string[] = [];
  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        if (maxDepth === undefined || maxDepth > 0) {
          const dirFiles = await readdirRecursive(
            entryPath,
            ignore,
            maxDepth === undefined ? undefined : maxDepth - 1
          );
          files.push(...dirFiles.map((f) => entry.name + "/" + f));
        }
      } else {
        if (!(ignore && ignore(entryPath))) {
          files.push(entry.name);
        }
      }
    })
  );
  return files;
}

export async function rmRecursive(dir: string): Promise<void> {
  const entries = await readdir(dir);
  await Promise.all(
    entries.map((entry) => {
      const entryPath = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        return rmRecursive(entryPath).then(() => fsPromises.rmdir(entryPath));
      } else {
        return fsPromises.unlink(entryPath);
      }
    })
  );
}
