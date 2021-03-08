import { Dirent, promises as fsPromises } from 'fs'
import { resolve, dirname } from 'path'

function isNotFound (err: any) {
  return err.code === 'ENOENT'
}

export async function writeFile (path: string, data: string) {
  await ensuredir(dirname(path))
  return fsPromises.writeFile(path, data, 'utf8')
}

export function readFile (path: string) {
  return fsPromises.readFile(path, 'utf8')
    .catch(err => isNotFound(err) ? null : Promise.reject(err))
}

export function stat (path: string) {
  return fsPromises.stat(path)
    .catch(err => isNotFound(err) ? null : Promise.reject(err))
}

export function unlink (path: string) {
  return fsPromises.unlink(path)
    .catch(err => isNotFound(err) ? undefined : Promise.reject(err))
}

export function readdir (dir: string): Promise<Dirent[]> {
  return fsPromises.readdir(dir, { withFileTypes: true })
    .catch(err => isNotFound(err) ? [] : Promise.reject(err))
}

export async function ensuredir (dir: string) {
  const _stat = await stat(dir)
  if (_stat && _stat.isDirectory()) {
    return
  }
  await ensuredir(dirname(dir))
  await fsPromises.mkdir(dir)
}

export async function readdirRecursive (dir: string): Promise<string[]> {
  const entries: Dirent[] = await readdir(dir)
  const files: string[] = []
  await Promise.all(entries.map(async (entry) => {
    const entryPath = resolve(dir, entry.name)
    if (entry.isDirectory()) {
      const dirFiles = await readdirRecursive(entryPath)
      files.push(...dirFiles.map(f => entry.name + '/' + f))
    } else {
      files.push(entry.name)
    }
  }))
  return files
}

export async function rmRecursive (dir: string): Promise<void> {
  const entries = await readdir(dir)
  await Promise.all(entries.map((entry) => {
    const entryPath = resolve(dir, entry.name)
    if (entry.isDirectory()) {
      return rmRecursive(entryPath).then(() => fsPromises.rmdir(entryPath))
    } else {
      return fsPromises.unlink(entryPath)
    }
  }))
}
