import { del, head, list, put } from "@vercel/blob";

import { defineDriver, normalizeKey, joinKeys, createError } from "./utils";
import fetch from "node-fetch-native";

export interface VercelBlobOptions {
  /**
   * Optional prefix to use for all keys. Can be used for namespacing.
   */
  base?: string;

  /**
   * Optional flag to customize environment variable prefix (Default is `BLOB`). Set to `false` to disable env inference for `token` options
   */
  env?: false | string;

  /**
   * Rest API Token to use for connecting to your Vercel Blob store. Default is `BLOB_READ_WRITE_TOKEN`.
   */
  token?: string;
}

const DRIVER_NAME = "vercel-blob";

export default defineDriver<VercelBlobOptions>((opts) => {
  const optsBase = normalizeKey(opts?.base);
  const r = (...keys: string[]) =>
    joinKeys(optsBase, ...keys).replace(/:/g, "/");

  const envPrefix =
    typeof process !== "undefined" && opts.env !== false
      ? `${opts.env || "BLOB"}_`
      : "";
  let token: string;
  if (opts.token) {
    token = opts.token;
  } else {
    const envName = envPrefix + "READ_WRITE_TOKEN";
    if (envPrefix && process.env[envName]) {
      token = process.env[envName];
    } else {
      throw createError(
        DRIVER_NAME,
        `missing required \`token\` option or '${envName}' env.`
      );
    }
  }

  const hasItem = async (key: string) => {
    const { blobs } = await list({
      token,
      prefix: r(key),
    });
    return blobs.some((item) => item.pathname === r(key));
  };

  const removeItem = async (key: string) => {
    const { blobs } = await list({
      token,
      prefix: r(key),
    });
    const blob = blobs.find((item) => item.pathname === r(key));
    if (blob)
      await del(blob.url, {
        token,
      });
  };

  const getKeys = async (base: string) => {
    const blobs = [];
    let cursor: string | undefined = undefined;
    do {
      const listBlobResult: Awaited<ReturnType<typeof list>> = await list({
        token,
        cursor,
        prefix: r(base),
      });
      cursor = listBlobResult.cursor;
      for (const blob of listBlobResult.blobs) {
        blobs.push(blob);
      }
    } while (cursor);
    return blobs.map((blob) =>
      blob.pathname.replace(new RegExp(`^${optsBase.replace(/:/g, "/")}/`), "")
    );
  };

  return {
    name: DRIVER_NAME,
    hasItem,
    async getItem(key) {
      const { blobs } = await list({
        token,
        prefix: r(key),
      });
      const blob = blobs.find((item) => item.pathname === r(key));
      return blob ? fetch(blob.url).then((res) => res.text()) : null;
    },
    async getItemRaw(key) {
      const { blobs } = await list({
        token,
        prefix: r(key),
      });
      const blob = blobs.find((item) => item.pathname === r(key));
      return blob ? fetch(blob.url).then((res) => res.arrayBuffer()) : null;
    },
    async getMeta(key) {
      const { blobs } = await list({
        token,
        prefix: r(key),
      });
      const blob = blobs.find((item) => item.pathname === r(key));
      const headBlobResult = blob
        ? await head(blob.url, {
            token,
          })
        : null;
      return headBlobResult
        ? {
            mtime: headBlobResult.uploadedAt,
            size: headBlobResult.size,
            uploadedAt: headBlobResult.uploadedAt,
            pathname: headBlobResult.pathname,
            contentType: headBlobResult.contentType,
            url: headBlobResult.url,
            downloadUrl: headBlobResult.downloadUrl,
            contentDisposition: headBlobResult.contentDisposition,
            cacheControl: headBlobResult.cacheControl,
          }
        : null;
    },
    async setItem(key, value, opts) {
      await put(r(key), value, {
        access: "public",
        addRandomSuffix: false,
        token,
        ...opts,
      });
    },
    async setItemRaw(key, value, opts) {
      await put(r(key), value, {
        access: "public",
        addRandomSuffix: false,
        token,
        ...opts,
      });
    },
    removeItem,
    getKeys,
    async clear(base) {
      let cursor: string | undefined = undefined;
      const blobs = [];
      do {
        const listBlobResult: Awaited<ReturnType<typeof list>> = await list({
          token,
          cursor,
          prefix: r(base),
        });
        blobs.push(...listBlobResult.blobs);
        cursor = listBlobResult.cursor;
      } while (cursor);

      if (blobs.length > 0) {
        await del(
          blobs.map((blob) => blob.url),
          {
            token,
          }
        );
      }
    },
  };
});
