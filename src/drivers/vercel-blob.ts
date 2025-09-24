import { del, head, list, put } from "@vercel/blob";
import { defineDriver, normalizeKey, joinKeys, createError } from "./utils";

export interface VercelBlobOptions {
  /**
   * Whether the blob should be publicly accessible. (required, must be "public")
   */
  access: "public";

  /**
   * Prefix to prepend to all keys. Can be used for namespacing.
   */
  base?: string;

  /**
   * Rest API Token to use for connecting to your Vercel Blob store.
   * If not provided, it will be read from the environment variable `BLOB_READ_WRITE_TOKEN`.
   */
  token?: string;

  /**
   * Prefix to use for token environment variable name.
   * Default is `BLOB` (env name = `BLOB_READ_WRITE_TOKEN`).
   */
  envPrefix?: string;
}

const DRIVER_NAME = "vercel-blob";

export default defineDriver<VercelBlobOptions>((opts) => {
  const optsBase = normalizeKey(opts?.base);

  const r = (...keys: string[]) =>
    joinKeys(optsBase, ...keys).replace(/:/g, "/");

  const envName = `${opts.envPrefix || "BLOB"}_READ_WRITE_TOKEN`;

  const getToken = () => {
    if (opts.access !== "public") {
      throw createError(DRIVER_NAME, `You must set { access: "public" }`);
    }
    const token = opts.token || globalThis.process?.env?.[envName];
    if (!token) {
      throw createError(
        DRIVER_NAME,
        `Missing token. Set ${envName} env or token config.`
      );
    }
    return token;
  };

  const get = async (key: string) => {
    const { blobs } = await list({
      token: getToken(),
      prefix: r(key),
    });
    const blob = blobs.find((item) => item.pathname === r(key));
    return blob;
  };

  return {
    name: DRIVER_NAME,
    options: opts,
    async hasItem(key: string) {
      const blob = await get(key);
      return !!blob;
    },
    async getItem(key) {
      const blob = await get(key);
      return blob ? fetch(blob.url).then((res) => res.text()) : null;
    },
    async getItemRaw(key) {
      const blob = await get(key);
      return blob ? fetch(blob.url).then((res) => res.arrayBuffer()) : null;
    },
    async getMeta(key) {
      const blob = await get(key);
      if (!blob) return null;
      const blobHead = await head(blob.url, {
        token: getToken(),
      });
      if (!blobHead) return null;
      return {
        mtime: blobHead.uploadedAt,
        ...blobHead,
      };
    },
    async setItem(key, value, opts) {
      await put(r(key), value, {
        access: "public",
        addRandomSuffix: false,
        token: getToken(),
        ...opts,
      });
    },
    async setItemRaw(key, value, opts) {
      await put(r(key), value, {
        access: "public",
        addRandomSuffix: false,
        token: getToken(),
        ...opts,
      });
    },
    async removeItem(key: string) {
      const blob = await get(key);
      if (blob) await del(blob.url, { token: getToken() });
    },
    async getKeys(base: string) {
      const blobs = [];
      let cursor: string | undefined = undefined;
      do {
        const listBlobResult: Awaited<ReturnType<typeof list>> = await list({
          token: getToken(),
          cursor,
          prefix: r(base),
        });
        cursor = listBlobResult.cursor;
        for (const blob of listBlobResult.blobs) {
          blobs.push(blob);
        }
      } while (cursor);
      return blobs.map((blob) =>
        blob.pathname.replace(
          new RegExp(`^${optsBase.replace(/:/g, "/")}/`),
          ""
        )
      );
    },
    async clear(base) {
      let cursor: string | undefined = undefined;
      const blobs = [];
      do {
        const listBlobResult: Awaited<ReturnType<typeof list>> = await list({
          token: getToken(),
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
            token: getToken(),
          }
        );
      }
    },
  };
});
