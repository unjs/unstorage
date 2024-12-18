import {
  defineDriver,
  createRequiredError,
  normalizeKey,
  createError,
} from "./utils";
import { AwsClient } from "aws4fetch";
import xml2js from "xml2js";

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
   * Whether to use bulk delete for clearing the storage.
   *
   * **Note:** [DeleteObject](https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObjects.html) support is required from provider
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

  const url = (key: string = "") => `${baseURL}/${normalizeKey(key)}`;

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
    let keys: string[] = [];
    xml2js.parseString(res, (error, result) => {
      if (error === null) {
        const contents = result["ListBucketResult"]["Contents"] as any[];
        keys = contents?.map((item) => item["Key"][0]);
      }
    });
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
      if (r?.status !== 204) {
        throw createError(DRIVER_NAME, `Failed to delete ${key}`);
      }
    });
  };

  // https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObjects.html
  const deleteObjects = async (base: string) => {
    const keys = await listObjects(base);
    if (!keys) {
      return null;
    }
    if (options.bulkDelete) {
      const body = deleteKeysReq(keys);
      await awsFetch(`${baseURL}?delete`, {
        method: "POST",
        headers: {
          "x-amz-checksum-sha256": await sha256Base64(body),
        },
        body,
      });
    } else {
      await Promise.all(keys.map((key) => deleteObject(key)));
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
  const binaryString = String.fromCharCode(...bytes); // eslint-disable-line unicorn/prefer-code-point
  return btoa(binaryString);
}
