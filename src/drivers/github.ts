import { defineDriver } from './utils'
import { $fetch } from 'ohmyfetch'
import { withTrailingSlash } from 'ufo'

export interface GithubOptions {
  org: string
  repo: string
  /**
   * @default "main"
   */
  branch: string
  /**
   * @default ""
   */
  dir: string
  token?: string

  /**
   * @default 600
   */
  ttl: number
}

export default defineDriver((options: GithubOptions) => {
  const { org, repo, branch = 'main', dir, token, ttl = 600 } = options
  const rawUrl = `https://raw.githubusercontent.com/${org}/${repo}/${branch}/${dir}`
  
  let files = {}
  let lastCheck = 0
  let isInitialized = false
  let initialTask: Promise<any>

  const syncFiles = async () => {
    if (!isInitialized || (lastCheck + ttl * 1000) < Date.now()) {
      if (!initialTask) initialTask = fetchFiles(options)
      files = await initialTask
      isInitialized = true
      lastCheck = Date.now()
    }
  }

  return {
    async getKeys () {
      await syncFiles()

      return Object.keys(files)
    },
    async hasItem (key) {
      await syncFiles()

      return !!files[key]
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
              Authorization: token ? `token ${token}` : undefined
            }
          })
        } catch (e) {
          // eslint-disable-next-line no-console
          console.log(`Failed to fetch file "${key}"`, e)
        }
      }
      return item.body
    },
    async getMeta (key) {
      await syncFiles()

      const item = files[key]
      if (!item) {
        return null
      }
      return item.meta
    }
  }
})
async function fetchFiles(options: GithubOptions) {
  const { dir, token, branch, org, repo } = options
  const prefix = withTrailingSlash(dir)
  const files = {}
  try {
    const tree = await $fetch(`https://api.github.com/repos/${org}/${repo}/git/trees/${branch}?recursive=1`, {
      headers: {
        Authorization: token ? `token ${token}` : undefined
      }
    })
    tree.tree.forEach((node) => {
      if (node.type === 'blob' && node.path.startsWith(prefix)) {
        const key = node.path.substring(prefix.length).replace(/\//g, ':')
        files[key] = {
          sha: node.sha,
          meta: {
            size: node.size
          }
        }
      }
    })
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log('Failed to fetch git tree', e)
  }
  return files
}