import { ofetch } from "ofetch";
import { createError, createRequiredError, defineDriver } from "./utils";

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

  const kvFetch = async (url: string, options?: any) =>
    opts["apiToken"] === "msw" //Using raw fetch is necessary for msw to work.
      ? fetch(`${baseURL}${url}`, { headers, ...options })
      : ofetch.native(`${baseURL}${url}`, {
          headers,
          ...options,
        });

  const hasItem = async (key: string) => {
    const response = await kvFetch(`/metadata/${key}`);
    if (response.status === 404) return false;
    const data = (await response.json()) as any;
    return data?.success === true;
  };

  const getItem = async (key: string) => {
    // Cloudflare API returns with `content-type: application/json`: https://developers.cloudflare.com/api/operations/workers-kv-namespace-read-key-value-pair
    const response = await kvFetch(`/values/${key}`);
    if (response.status === 404) return null;
    return response.json();
  };

  const setItem = async (
    key: string,
    value: any,
    options: Record<string, any>
  ) => {
    await kvFetch(`/bulk`, {
      method: "PUT",
      body: JSON.stringify([{ key, value, ...options }]),
    });
  };

  const removeItem = async (key: string) => {
    await kvFetch(`/values/${key}`, { method: "DELETE" });
  };

  const getKeys = async (base?: string) => {
    const keys: string[] = [];

    const params: Record<string, string> = {};
    if (base) {
      params.prefix = base;
    }

    const firstPage = await kvFetch("/keys", { params });
    const data = (await firstPage.json()) as any;
    data.result.forEach(({ name }: { name: string }) => keys.push(name));

    const cursor = data.result_info.cursor;
    if (cursor) {
      params.cursor = cursor;
    }

    while (params.cursor) {
      const pageResult = await kvFetch("/keys", { params });
      const dataPageResult = (await pageResult.json()) as any;
      dataPageResult.result.forEach(({ name }: { name: string }) =>
        keys.push(name)
      );
      const pageCursor = dataPageResult.result_info.cursor;
      if (pageCursor) {
        params.cursor = pageCursor;
      } else {
        params.cursor = undefined;
      }
    }
    return keys;
  };

  const clear = async () => {
    const keys: string[] = await getKeys();
    // Split into chunks of 10000, as the API only allows for 10,000 keys at a time
    const chunks = keys.reduce(
      (acc, key, i) => {
        if (i % 10000 === 0) {
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
    getKeys,
    clear,
  };
});
