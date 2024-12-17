import {
  defineDriver,
  createRequiredError,
  normalizeKey,
  createError,
} from "./utils";
import { AwsClient } from "aws4fetch";
import xml2js from "xml2js";
import js2xml from "jstoxml";

export interface S3DriverOptions {
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
  region: string;
  bucket: string;
  accountId?: string;
}

const DRIVER_NAME = "s3";

export default defineDriver((options: S3DriverOptions) => {
  let awsClient: AwsClient;

  const getAwsClient = () => {
    if (!awsClient) {
      if (!options.accessKeyId) {
        throw createRequiredError(DRIVER_NAME, "accessKeyId");
      }
      if (!options.secretAccessKey) {
        throw createRequiredError(DRIVER_NAME, "secretAccessKey");
      }
      if (!options.bucket) {
        throw createRequiredError(DRIVER_NAME, "bucket");
      }
      if (!options.endpoint) {
        throw createRequiredError(DRIVER_NAME, "endpoint");
      }
      if (!options.region) {
        throw createRequiredError(DRIVER_NAME, "region");
      }
      awsClient = new AwsClient({
        service: "s3",
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
        region: options.region,
      });
    }
    return awsClient;
  };

  const baseURL = `${options.endpoint.replace(/\/$/, "")}/${options.bucket}`;

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
        `[${request.method}] ${url}: ${res.status} ${res.statusText}`
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
    if (!options.accountId) {
      return Promise.all(keys.map((key) => deleteObject(key)));
    }
    const body = js2xml.toXML({
      Delete: keys.map((key) => ({ Object: { Key: key } })),
    });
    await awsFetch(baseURL, {
      method: "DELETE",
      body,
      headers: {
        "x-amz-expected-bucket-owner": options.accountId,
      },
    });
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
