import { createError, createRequiredError, type DriverFactory, joinKeys } from "./utils/index.ts";
import { createFetch, FetchError } from "./utils/fetch.ts";

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
  /**
   * The minimum time-to-live (ttl) for setItem in seconds.
   * The default is 60 seconds as per Cloudflare's [documentation](https://developers.cloudflare.com/kv/api/write-key-value-pairs/).
   */
  minTTL?: number;
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

const driver: DriverFactory<KVHTTPOptions> = (opts) => {
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
      "One of the `apiToken`, `userServiceKey`, or a combination of `email` and `apiKey` is required.",
    );
  }

  const apiURL = opts.apiURL || "https://api.cloudflare.com";
  const baseURL = `${apiURL}/client/v4/accounts/${opts.accountId}/storage/kv/namespaces/${opts.namespaceId}`;
  const kvFetch = createFetch({ baseURL, headers });

  const r = (key: string = "") => (opts.base ? joinKeys(opts.base, key) : key);

  const hasItem = async (key: string) => {
    try {
      const res = await kvFetch(`/metadata/${r(key)}`).then((res) => res.json());
      return (res as { success?: boolean })?.success === true;
    } catch (error) {
      if (error instanceof FetchError && error.status === 404) {
        return false;
      }
      throw error;
    }
  };

  const getItem = async (key: string) => {
    try {
      // Cloudflare API returns with `content-type: application/octet-stream`
      return await kvFetch(`/values/${r(key)}`).then((res) => res.text());
    } catch (error) {
      if (error instanceof FetchError && error.status === 404) {
        return null;
      }
      throw error;
    }
  };

  const setItem = async (key: string, value: any, topts: any) => {
    await kvFetch(`/values/${r(key)}`, {
      method: "PUT",
      body: value,
      query: topts?.ttl ? { expiration_ttl: Math.max(topts?.ttl, opts.minTTL || 60) } : undefined,
    });
  };

  const removeItem = async (key: string) => {
    await kvFetch(`/values/${r(key)}`, { method: "DELETE" });
  };

  type KeysResponse = {
    result: { name: string }[];
    result_info: { cursor?: string };
  };

  const getKeys = async (base?: string) => {
    const keys: string[] = [];

    const query: Record<string, string | undefined> = {};
    if (base || opts.base) {
      query.prefix = r(base);
    }

    const firstPage: KeysResponse = await kvFetch("/keys", { query }).then((res) => res.json());
    for (const item of firstPage.result) {
      keys.push(item.name);
    }

    const cursor = firstPage.result_info.cursor;
    if (cursor) {
      query.cursor = cursor;
    }

    while (query.cursor) {
      const pageResult: KeysResponse = await kvFetch("/keys", { query }).then((res) => res.json());
      for (const item of pageResult.result) {
        keys.push(item.name);
      }
      const pageCursor = pageResult.result_info.cursor;
      query.cursor = pageCursor ? pageCursor : undefined;
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
        acc[acc.length - 1]!.push(key);
        return acc;
      },
      [[]],
    );
    // Call bulk delete endpoint with each chunk
    await Promise.all(
      chunks.map(async (chunk) => {
        if (chunk.length > 0) {
          await kvFetch("/bulk/delete", {
            method: "POST",
            body: chunk,
          });
        }
      }),
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
        keys.map((key) => (opts.base ? key.slice(opts.base.length) : key)),
      ),
    clear,
  };
};

export default driver;
