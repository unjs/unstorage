import { defineDriver } from './utils'
import { $fetch } from 'ohmyfetch'
import { withTrailingSlash, joinURL } from 'ufo'

export interface GithubOptions {
  repo: string
  /**
   * @default "main"
   */
  branch: string
  /**
   * @default ""
   */
  dir: string
  /**
   * @default 600
   */
  ttl: number
  token?: string
  /**
   * @default "https://api.github.com"
   */
  apiUrl?: string
  /**
   * @default "https://raw.githubusercontent.com"
   */
  cdnUrl?: string 
}

const defaultOptions = {
  branch: 'main',
  ttl: 600,
  dir: '',
  apiUrl: 'https://api.github.com',
  cdnUrl: 'https://raw.githubusercontent.com'
}

export default defineDriver((_opts: GithubOptions) => {
  const opts = { ...defaultOptions, ..._opts }
  const rawUrl = joinURL(opts.cdnUrl, opts.repo, opts.branch, opts.dir)
  
  let files = {}
  let lastCheck = 0
  let syncPromise: Promise<any>

  const syncFiles = async () => {
    if ((lastCheck + opts.ttl * 1000) > Date.now()) {
      return 
    }

    if (!syncPromise) {
      syncPromise = fetchFiles(opts)
    }

    files = await syncPromise
    lastCheck = Date.now()
    syncPromise = undefined
  }

  return {
    async getKeys () {
      await syncFiles()

      return Object.keys(files)
    },
    async hasItem (key) {
      await syncFiles()

      return key in files
    },
    async getItem (key) {
      await syncFiles()

      const item = files[key]

      if (!item) {
        return null
      }

      if (!item.body) {
        try {
          item.body = await $fetch(key.replace(/:/g, '/'), {
            baseURL: rawUrl,
            headers: {
              Authorization: opts.token ? `token ${opts.token}` : undefined
            }
          })
        } catch (e) {
          throw new Error(`Failed to fetch file "${key}"`, { cause: e })
        }
      }
      return item.body
    },
    async getMeta (key) {
      await syncFiles()

      const item = files[key]

      return item ? item.meta : null
    }
  }
})
async function fetchFiles(opts: GithubOptions) {
  const prefix = withTrailingSlash(opts.dir)
  const files = {}
  try {
    const trees = await $fetch(`/repos/${opts.repo}/git/trees/${opts.branch}?recursive=1`, {
      baseURL: opts.apiUrl,
      headers: {
        Authorization: opts.token ? `token ${opts.token}` : undefined
      }
    })

    for (const node of trees.tree) {
      if (node.type !== 'blob' || !node.path.startsWith(prefix)) {
        continue
      }
      const key = node.path.substring(prefix.length).replace(/\//g, ':')
      files[key] = {
        meta: {
          sha: node.sha,
          mode: node.mode,
          size: node.size
        }
      }
    }
  } catch (e) {
    throw new Error(`Failed to fetch git tree`, { cause: e })
  }
  return files
}