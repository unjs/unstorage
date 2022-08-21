import { $fetch } from 'ohmyfetch'
import { defineDriver } from './utils'

const LOG_TAG = '[unstorage] [cloudflare-http] '

interface KVAuthAPIToken {
  /**
   * API Token generated from the [User Profile 'API Tokens' page](https://dash.cloudflare.com/profile/api-tokens)
   * of the Cloudflare console.
   * @see https://api.cloudflare.com/#getting-started-requests
   */
  apiToken: string
}

interface KVAuthServiceKey {
  /**
   * A special Cloudflare API key good for a restricted set of endpoints.
   * Always begins with "v1.0-", may vary in length.
   * May be used to authenticate in place of `apiToken` or `apiKey` and `email`.
   * @see https://api.cloudflare.com/#getting-started-requests
   */
  userServiceKey: string
}

interface KVAuthEmailKey {
  /**
   * Email address associated with your account.
   * Should be used along with `apiKey` to authenticate in place of `apiToken`.
   */
  email: string
  /**
   * API key generated on the "My Account" page of the Cloudflare console.
   * Should be used along with `email` to authenticate in place of `apiToken`.
   * @see https://api.cloudflare.com/#getting-started-requests
   */
  apiKey: string
}

export type KVHTTPOptions = {
  /**
   * Cloudflare account ID (required)
   */
  accountId: string
  /**
   * The ID of the KV namespace to target (required)
   */
  namespaceId: string
  /**
   * The URL of the Cloudflare API.
   * @default https://api.cloudflare.com
   */
  apiURL?: string
} & (KVAuthServiceKey | KVAuthAPIToken | KVAuthEmailKey)

type CloudflareAuthorizationHeaders = {
  'X-Auth-Email': string
  'X-Auth-Key': string
  'X-Auth-User-Service-Key'?: string
  Authorization?: `Bearer ${string}`
} | {
  'X-Auth-Email'?: string
  'X-Auth-Key'?: string
  'X-Auth-User-Service-Key': string
  Authorization?: `Bearer ${string}`
} | {
  'X-Auth-Email'?: string
  'X-Auth-Key'?: string
  'X-Auth-User-Service-Key'?: string
  Authorization: `Bearer ${string}`
}

export default defineDriver<KVHTTPOptions>((opts) => {
  if (!opts.accountId) {
    throw new Error(LOG_TAG + '`accountId` is required.')
  }
  if (!opts.namespaceId) {
    throw new Error(LOG_TAG + '`namespaceId` is required.')
  }

  let headers: CloudflareAuthorizationHeaders

  if ('apiToken' in opts) {
    headers = { Authorization: `Bearer ${opts.apiToken}` }
  } else if ('userServiceKey' in opts) {
    headers = { 'X-Auth-User-Service-Key': opts.userServiceKey }
  } else if (opts.email && opts.apiKey) {
    headers = { 'X-Auth-Email': opts.email, 'X-Auth-Key': opts.apiKey }
  } else {
    throw new Error(
      LOG_TAG + 'One of the `apiToken`, `userServiceKey`, or a combination of `email` and `apiKey` is required.'
    )
  }

  const apiURL = opts.apiURL || 'https://api.cloudflare.com'
  const baseURL = `${apiURL}/client/v4/accounts/${opts.accountId}/storage/kv/namespaces/${opts.namespaceId}`
  const kvFetch = $fetch.create({ baseURL, headers })

  const hasItem = async (key: string) => {
    try {
      await kvFetch(`/values/${key}`)
      return true
    } catch {
      return false
    }
  }

  const getItem = async (key: string) => {
    // Cloudflare API returns with `content-type: application/octet-stream`
    let result = await kvFetch(`/values/${key}`, { parseResponse: txt => txt })
    try {
      result = JSON.parse(result)
    } catch {}
    return result
  }

  const setItem = async (key: string, value: any) => {
    return await kvFetch(`/values/${key}`, { method: 'PUT', body: value })
  }

  const removeItem = async (key: string) => {
    return await kvFetch(`/values/${key}`, { method: 'DELETE' })
  }

  const getKeys = async (base?: string) => {
    const keys: string[] = []

    const params = new URLSearchParams()
    if (base) {
      params.set('prefix', base)
    }

    const firstPage = await kvFetch('/keys', { params })
    firstPage.result.forEach(({ name }: { name: string }) => keys.push(name))

    const cursor = firstPage.result_info.cursor
    if (cursor) {
      params.set('cursor', cursor)
    }

    while (params.has('cursor')) {
      const pageResult = await kvFetch('/keys', { params })
      pageResult.result.forEach(({ name }: { name: string }) => keys.push(name))
      const pageCursor = pageResult.result_info.cursor
      if (pageCursor) {
        params.set('cursor', pageCursor)
      } else {
        params.delete('cursor')
      }
    }
    return keys
  }

  const clear = async () => {
    const keys: string[] = await getKeys()
    // Split into chunks of 10000, as the API only allows for 10,000 keys at a time
    const chunks = keys.reduce((acc, key, i) => {
      if (i % 10000 === 0) { acc.push([]) }
      acc[acc.length - 1].push(key)
      return acc
    }, [[]])
    // Call bulk delete endpoint with each chunk
    await Promise.all(chunks.map((chunk) => {
      return kvFetch('/bulk', {
        method: 'DELETE',
        body: { keys: chunk },
      })
    }))
  }

  return {
    hasItem,
    getItem,
    setItem,
    removeItem,
    getKeys,
    clear,
  }
})
