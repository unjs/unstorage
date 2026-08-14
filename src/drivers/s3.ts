import {
  defineDriver,
  createRequiredError,
  normalizeKey,
  createError,
} from "./utils/index.ts";
import { AwsClient } from "aws4fetch";

export interface S3DriverOptions {
  /**
   * Access Key ID
   */
  accessKeyId: string;

  /**
   * Secret Access Key
   */
  secretAccessKey: string;

  /**
   * The endpoint URL of the S3 service.
   *
   * - For AWS S3: "https://s3.[region].amazonaws.com/"
   * - For cloudflare R2: "https://[uid].r2.cloudflarestorage.com/"
   */
  endpoint: string;

  /**
   * The region of the S3 bucket.
   *
   * - For AWS S3, this is the region of the bucket.
   * - For cloudflare, this is can be set to `auto`.
   */
  region: string;

  /**
   * The name of the bucket.
   */
  bucket: string;

  /**
   * Enabled by default to speedup `clear()` operation. Set to `false` if provider is not implementing [DeleteObject](https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObjects.html).
   */
  bulkDelete?: boolean;
}

const DRIVER_NAME = "s3";

export default defineDriver((options: S3DriverOptions) => {
  let _awsClient: AwsClient;
  const getAwsClient = () => {
    if (!_awsClient) {
      if (!options.accessKeyId) {
        throw createRequiredError(DRIVER_NAME, "accessKeyId");
      }
      if (!options.secretAccessKey) {
        throw createRequiredError(DRIVER_NAME, "secretAccessKey");
      }
      if (!options.endpoint) {
        throw createRequiredError(DRIVER_NAME, "endpoint");
      }
      if (!options.region) {
        throw createRequiredError(DRIVER_NAME, "region");
      }
      _awsClient = new AwsClient({
        service: "s3",
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
        region: options.region,
      });
    }
    return _awsClient;
  };

  const baseURL = `${options.endpoint.replace(/\/$/, "")}/${options.bucket || ""}`;

  const url = (key: string = "") => `${baseURL}/${normalizeKey(key, "/")}`;

  const awsFetch = async (url: string, opts?: RequestInit) => {
    const request = await getAwsClient().sign(url, opts);
    const res = await fetch(request);
    if (!res.ok) {
      if (res.status === 404) {
        return null;
      }
      throw createError(
        DRIVER_NAME,
        `[${request.method}] ${url}: ${res.status} ${res.statusText} ${await res.text()}`
      );
    }
    return res;
  };

  // https://docs.aws.amazon.com/AmazonS3/latest/API/API_HeadObject.html
  const headObject = async (key: string) => {
    const res = await awsFetch(url(key), { method: "HEAD" });
    if (!res) {
      return null;
    }
    const metaHeaders: HeadersInit = {};
    for (const [key, value] of res.headers.entries()) {
      const match = /x-amz-meta-(.*)/.exec(key);
      if (match?.[1]) {
        metaHeaders[match[1]] = value;
      }
    }
    return metaHeaders;
  };

  // https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html
  const listObjects = async (base?: string) => {
    // Trailing separator is required to avoid matching sibling prefixes (`foo` should not match `foobar/`)
    const prefix = normalizeKey(base, "/");
    const keys: string[] = [];
    let continuationToken: string | undefined;

    do {
      const params = new URLSearchParams({ "list-type": "2" });
      if (prefix) {
        params.set("prefix", `${prefix}/`);
      }
      if (continuationToken) {
        params.set("continuation-token", continuationToken);
      }

      const res = await awsFetch(`${baseURL}?${params}`).then((r) => r?.text());
      if (!res) {
        if (continuationToken) {
          // Bailing out mid-pagination would silently return a partial list
          throw createError(DRIVER_NAME, `Failed to list objects in ${prefix}`);
        }
        return [];
      }

      const result = parseList(res);
      keys.push(...result.keys);
      continuationToken = result.isTruncated ? result.nextToken : undefined;
    } while (continuationToken);

    return keys;
  };

  // https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html
  const getObject = (key: string) => {
    return awsFetch(url(key));
  };

  // https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html
  const putObject = async (key: string, value: string) => {
    return awsFetch(url(key), {
      method: "PUT",
      body: value,
    });
  };

  // https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObject.html
  const deleteObject = async (key: string) => {
    return awsFetch(url(key), { method: "DELETE" }).then((r) => {
      if (r?.status !== 204 && r?.status !== 200) {
        throw createError(DRIVER_NAME, `Failed to delete ${key}`);
      }
    });
  };

  // https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObjects.html
  const deleteObjects = async (base: string) => {
    const keys = await listObjects(base);
    if (keys.length === 0) {
      return null;
    }
    if (options.bulkDelete === false) {
      await Promise.all(keys.map((key) => deleteObject(key)));
    } else {
      const body = deleteKeysReq(keys);
      await awsFetch(`${baseURL}?delete`, {
        method: "POST",
        headers: {
          "x-amz-checksum-sha256": await sha256Base64(body),
        },
        body,
      });
    }
  };

  return {
    name: DRIVER_NAME,
    options,
    getItem(key) {
      return getObject(key).then((res) => (res ? res.text() : null));
    },
    getItemRaw(key) {
      return getObject(key).then((res) => (res ? res.arrayBuffer() : null));
    },
    async setItem(key, value) {
      await putObject(key, value);
    },
    async setItemRaw(key, value) {
      await putObject(key, value);
    },
    getMeta(key) {
      return headObject(key);
    },
    hasItem(key) {
      return headObject(key).then((meta) => !!meta);
    },
    getKeys(base) {
      return listObjects(base);
    },
    async removeItem(key) {
      await deleteObject(key);
    },
    async clear(base) {
      await deleteObjects(base);
    },
  };
});

// --- utils ---

function deleteKeysReq(keys: string[]) {
  return `<Delete>${keys
    .map((key) => {
      // prettier-ignore
      key = key.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      return /* xml */ `<Object><Key>${key}</Key></Object>`;
    })
    .join("")}</Delete>`;
}

async function sha256Base64(str: string) {
  const buffer = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  const bytes = new Uint8Array(hash);
  const binaryString = String.fromCharCode(...bytes);
  return btoa(binaryString);
}

function parseList(xml: string) {
  if (!xml.startsWith("<?xml")) {
    throw new Error("Invalid XML");
  }
  const listBucketResult = xml.match(
    /<ListBucketResult[^>]*>([\s\S]*)<\/ListBucketResult>/
  )?.[1];
  if (!listBucketResult) {
    throw new Error("Missing <ListBucketResult>");
  }
  const contents = listBucketResult.match(
    /<Contents[^>]*>([\s\S]*?)<\/Contents>/g
  );
  const keys = (contents || [])
    .map((content) => {
      const key = content.match(/<Key>([\s\S]+?)<\/Key>/)?.[1];
      return key;
    })
    .filter(Boolean) as string[];
  // Some S3 compatible providers echo <NextContinuationToken> even when not truncated
  const isTruncated =
    listBucketResult.match(/<IsTruncated>([\s\S]*?)<\/IsTruncated>/)?.[1] ===
    "true";
  const nextToken = listBucketResult.match(
    /<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/
  )?.[1];
  return { keys, isTruncated, nextToken };
}
