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

export interface S3ItemOptions {
  /**
   * HTTP headers to set when uploading the object.
   * Supports standard S3 headers like Content-Type, Cache-Control, etc.
   * and custom metadata via x-amz-meta-* prefixed headers.
   */
  headers?: {
    "Content-Type"?: string;
    "Cache-Control"?: string;
    "Content-Disposition"?: string;
    "Content-Encoding"?: string;
    "Content-Language"?: string;
    Expires?: string;
  } & {
    [key: `x-amz-meta-${string}`]: string | undefined;
  };
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
  const listObjects = async (prefix?: string) => {
    const res = await awsFetch(baseURL).then((r) => r?.text());
    if (!res) {
      console.log("no list", prefix ? `${baseURL}?prefix=${prefix}` : baseURL);
      return null;
    }
    return parseList(res);
  };

  // https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html
  const getObject = (key: string) => {
    return awsFetch(url(key));
  };

  // https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html
  const putObject = async (
    key: string,
    value: BufferSource | string,
    headers?: Record<string, string | undefined>
  ) => {
    return awsFetch(url(key), {
      method: "PUT",
      headers: headers
        ? (Object.fromEntries(
            Object.entries(headers).filter(([_, v]) => v !== undefined)
          ) as Record<string, string>)
        : undefined,
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
    if (!keys?.length) {
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
    async setItem(key, value, topts?: S3ItemOptions) {
      await putObject(key, value, topts?.headers);
    },
    async setItemRaw(key, value, topts?: S3ItemOptions) {
      await putObject(key, value, topts?.headers);
    },
    getMeta(key) {
      return headObject(key);
    },
    hasItem(key) {
      return headObject(key).then((meta) => !!meta);
    },
    getKeys(base) {
      return listObjects(base).then((keys) => keys || []);
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
  if (!contents?.length) {
    return [];
  }
  return contents
    .map((content) => {
      const key = content.match(/<Key>([\s\S]+?)<\/Key>/)?.[1];
      return key;
    })
    .filter(Boolean) as string[];
}
