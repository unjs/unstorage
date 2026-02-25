import * as blob from "@vercel/blob";
import {
  defineDriver,
  normalizeKey,
  joinKeys,
  createError,
} from "./utils/index.ts";
import type { DriverFactory } from "./utils/index.ts";

export interface VercelBlobOptions {
  /**
   * Whether the blob should be publicly or privately accessible.
   *
   * - `"public"`: Blobs are accessible via their URL without authentication.
   * - `"private"`: Blobs require authentication to access.
   */
  access: "public" | "private";

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

const driver: DriverFactory<VercelBlobOptions, never> = defineDriver((opts) => {
  const optsBase = normalizeKey(opts?.base);

  const r = (...keys: string[]) =>
    joinKeys(optsBase, ...keys).replace(/:/g, "/");

  const envName = `${opts.envPrefix || "BLOB"}_READ_WRITE_TOKEN`;

  const getToken = () => {
    const token = opts.token || globalThis.process?.env?.[envName];
    if (!token) {
      throw createError(
        DRIVER_NAME,
        `Missing token. Set ${envName} env or token config.`
      );
    }
    return token;
  };

  const get = (key: string) =>
    blob.get(r(key), { token: getToken(), access: opts.access });

  return {
    name: DRIVER_NAME,
    options: opts,
    async hasItem(key: string) {
      try {
        await blob.head(r(key), { token: getToken() });
        return true;
      } catch {
        return false;
      }
    },
    async getItem(key) {
      const result = await get(key);
      if (!result) return null;
      return new Response(result.stream).text();
    },
    async getItemRaw(key) {
      const result = await get(key);
      if (!result) return null;
      return new Response(result.stream).arrayBuffer();
    },
    async getMeta(key) {
      try {
        const blobHead = await blob.head(r(key), { token: getToken() });
        return {
          mtime: blobHead.uploadedAt,
          ...blobHead,
        };
      } catch {
        return null;
      }
    },
    async setItem(key, value, callOpts) {
      await blob.put(r(key), value, {
        access: opts.access,
        addRandomSuffix: false,
        token: getToken(),
        ...callOpts,
      });
    },
    async setItemRaw(key, value, callOpts) {
      await blob.put(r(key), value, {
        access: opts.access,
        addRandomSuffix: false,
        token: getToken(),
        ...callOpts,
      });
    },
    async removeItem(key: string) {
      await blob.del(r(key), { token: getToken() });
    },
    async getKeys(base: string) {
      const blobs: any[] = [];
      let cursor: string | undefined = undefined;
      do {
        const listBlobResult: Awaited<ReturnType<typeof blob.list>> =
          await blob.list({
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
      const blobs: any[] = [];
      do {
        const listBlobResult: Awaited<ReturnType<typeof blob.list>> =
          await blob.list({
            token: getToken(),
            cursor,
            prefix: r(base),
          });
        blobs.push(...listBlobResult.blobs);
        cursor = listBlobResult.cursor;
      } while (cursor);

      if (blobs.length > 0) {
        await blob.del(
          blobs.map((blob) => blob.url),
          {
            token: getToken(),
          }
        );
      }
    },
  };
});

export default driver;
