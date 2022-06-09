import { defineDriver } from './utils'
import { $fetch } from 'ohmyfetch'
import { withTrailingSlash } from 'ufo'

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
}

const GITHUB_URL = 'https://api.github.com'
const GITHUB_CDN_URL = 'https://raw.githubusercontent.com'

export default defineDriver((_opts: GithubOptions) => {
  const opts = { branch: 'main', ttl: 600, ..._opts }
  const rawUrl = `${GITHUB_CDN_URL}/${opts.repo}/${opts.branch}/${opts.dir}`
  
  let files = {}
  let lastCheck = 0
  let initialTask: Promise<any>

  const syncFiles = async () => {
    if ((lastCheck + opts.ttl * 1000) > Date.now()) {
      return 
    }

    if (!initialTask) {
      initialTask = fetchFiles(opts)
    }

    files = await initialTask
    lastCheck = Date.now()
    initialTask = undefined
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
          item.body = await $fetch(`${rawUrl}/${key.replace(/:/g, '/')}`, {
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
    const trees = await $fetch(`${GITHUB_URL}/repos/${opts.repo}/git/trees/${opts.branch}?recursive=1`, {
      headers: {
        Authorization: opts.token ? `token ${opts.token}` : undefined
      }
    })

    for (const node of trees.tree) {
      if (node.type !== 'blob') {
        continue
      }
      if (!node.path.startsWith(prefix)) {
        continue
      }
      const key = node.path.substring(prefix.length).replace(/\//g, ':')
      files[key] = {
        sha: node.sha,
        meta: {
          size: node.size
        }
      }
    }
  } catch (e) {
    throw new Error(`Failed to fetch git tree`, { cause: e })
  }
  return files
}