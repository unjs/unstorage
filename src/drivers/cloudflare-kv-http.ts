import { $fetch } from "ofetch";
import {
  createError,
  createRequiredError,
  defineDriver,
  joinKeys,
} from "./utils";

interface KVAuthAPIToken {
  /**
   * API Token generated from the [User Profile 'API Tokens' page](https://dash.cloudflare.com/profile/api-tokens)
   * of the Cloudflare console.
   * @see https://api.cloudflare.com/#getting-started-requests
   */
  apiToken: string;
}

interface KVAuthServiceKey {
  /**
   * A special Cloudflare API key good for a restricted set of endpoints.
   * Always begins with "v1.0-", may vary in length.
   * May be used to authenticate in place of `apiToken` or `apiKey` and `email`.
   * @see https://api.cloudflare.com/#getting-started-requests
   */
  userServiceKey: string;
}

interface KVAuthEmailKey {
  /**
   * Email address associated with your account.
   * Should be used along with `apiKey` to authenticate in place of `apiToken`.
   */
  email: string;
  /**
   * API key generated on the "My Account" page of the Cloudflare console.
   * Should be used along with `email` to authenticate in place of `apiToken`.
   * @see https://api.cloudflare.com/#getting-started-requests
   */
  apiKey: string;
}

export type KVHTTPOptions = {
  /**
   * Cloudflare account ID (required)
   */
  accountId: string;
  /**
   * The ID of the KV namespace to target (required)
   */
  namespaceId: string;
  /**
   * The URL of the Cloudflare API.
   * @default https://api.cloudflare.com
   */
  apiURL?: string;
  /**
   * Adds prefix to all stored keys
   */
  base?: string;
} & (KVAuthServiceKey | KVAuthAPIToken | KVAuthEmailKey);

type CloudflareAuthorizationHeaders =
  | {
      "X-Auth-Email": string;
      "X-Auth-Key": string;
      "X-Auth-User-Service-Key"?: string;
      Authorization?: `Bearer ${string}`;
    }
  | {
      "X-Auth-Email"?: string;
      "X-Auth-Key"?: string;
      "X-Auth-User-Service-Key": string;
      Authorization?: `Bearer ${string}`;
    }
  | {
      "X-Auth-Email"?: string;
      "X-Auth-Key"?: string;
      "X-Auth-User-Service-Key"?: string;
      Authorization: `Bearer ${string}`;
    };

const DRIVER_NAME = "cloudflare-kv-http";

export default defineDriver<KVHTTPOptions>((opts) => {
  if (!opts.accountId) {
    throw createRequiredError(DRIVER_NAME, "accountId");
  }
  if (!opts.namespaceId) {
    throw createRequiredError(DRIVER_NAME, "namespaceId");
  }

  let headers: CloudflareAuthorizationHeaders;

  if ("apiToken" in opts) {
    headers = { Authorization: `Bearer ${opts.apiToken}` };
  } else if ("userServiceKey" in opts) {
    headers = { "X-Auth-User-Service-Key": opts.userServiceKey };
  } else if (opts.email && opts.apiKey) {
    headers = { "X-Auth-Email": opts.email, "X-Auth-Key": opts.apiKey };
  } else {
    throw createError(
      DRIVER_NAME,
      "One of the `apiToken`, `userServiceKey`, or a combination of `email` and `apiKey` is required."
    );
  }

  const apiURL = opts.apiURL || "https://api.cloudflare.com";
  const baseURL = `${apiURL}/client/v4/accounts/${opts.accountId}/storage/kv/namespaces/${opts.namespaceId}`;
  const kvFetch = $fetch.create({ baseURL, headers });

  const r = (key: string = "") => (opts.base ? joinKeys(opts.base, key) : key);

  const hasItem = async (key: string) => {
    try {
      const res = await kvFetch(`/metadata/${r(key)}`);
      return res?.success === true;
    } catch (err: any) {
      if (!err?.response) {
        throw err;
      }
      if (err?.response?.status === 404) {
        return false;
      }
      throw err;
    }
  };

  const getItem = async (key: string) => {
    try {
      // Cloudflare API returns with `content-type: application/octet-stream`
      return await kvFetch(`/values/${r(key)}`).then((r) => r.text());
    } catch (err: any) {
      if (!err?.response) {
        throw err;
      }
      if (err?.response?.status === 404) {
        return null;
      }
      throw err;
    }
  };

  const setItem = async (key: string, value: any, opt: any) => {
    return await kvFetch(`/values/${r(key)}`, {
      method: "PUT",
      body: value,
      query: opt?.ttl ? { expiration_ttl: opt?.ttl } : {},
    });
  };

  const removeItem = async (key: string) => {
    return await kvFetch(`/values/${r(key)}`, { method: "DELETE" });
  };

  const getKeys = async (base?: string) => {
    const keys: string[] = [];

    const params: Record<string, string | undefined> = {};
    if (base || opts.base) {
      params.prefix = r(base);
    }

    const firstPage = await kvFetch("/keys", { params });
    for (const item of firstPage.result as { name: string }[]) {
      keys.push(item.name);
    }

    const cursor = firstPage.result_info.cursor;
    if (cursor) {
      params.cursor = cursor;
    }

    while (params.cursor) {
      const pageResult = await kvFetch("/keys", { params });
      for (const item of pageResult.result as { name: string }[]) {
        keys.push(item.name);
      }
      const pageCursor = pageResult.result_info.cursor;
      params.cursor = pageCursor ? pageCursor : undefined;
    }
    return keys;
  };

  const clear = async () => {
    const keys: string[] = await getKeys();
    // Split into chunks of 10000, as the API only allows for 10,000 keys at a time
    // TODO: Avoid reduce
    // eslint-disable-next-line unicorn/no-array-reduce
    const chunks = keys.reduce<string[][]>(
      (acc, key, i) => {
        if (i % 10_000 === 0) {
          acc.push([]);
        }
        acc[acc.length - 1].push(key);
        return acc;
      },
      [[]]
    );
    // Call bulk delete endpoint with each chunk
    await Promise.all(
      chunks.map((chunk) => {
        return kvFetch("/bulk", {
          method: "DELETE",
          body: { keys: chunk },
        });
      })
    );
  };

  return {
    name: DRIVER_NAME,
    options: opts,
    hasItem,
    getItem,
    setItem,
    removeItem,
    getKeys: (base?: string) =>
      getKeys(base).then((keys) =>
        keys.map((key) => (opts.base ? key.slice(opts.base.length) : key))
      ),
    clear,
  };
});
