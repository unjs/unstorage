import * as blob from "@vercel/blob";
import { type DriverFactory, normalizeKey, joinKeys, createError } from "./utils/index.ts";
import { CASMismatchError } from "./utils/cas.ts";

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

const driver: DriverFactory<VercelBlobOptions> = (opts) => {
  const optsBase = normalizeKey(opts?.base);

  const r = (...keys: string[]) => joinKeys(optsBase, ...keys).replace(/:/g, "/");

  const envName = `${opts.envPrefix || "BLOB"}_READ_WRITE_TOKEN`;

  const getToken = () => {
    const token = opts.token || globalThis.process?.env?.[envName];
    if (!token) {
      throw createError(DRIVER_NAME, `Missing token. Set ${envName} env or token config.`);
    }
    return token;
  };

  const get = (key: string) => blob.get(r(key), { token: getToken(), access: opts.access });

  // Vercel Blob exposes ETags and supports `ifMatch` natively on `put()`. The
  // `ifNoneMatch: "*"` precondition (create-only) is mapped onto
  // `allowOverwrite: false`, which is its default behavior. Other variants
  // (`ifMatch: "*"`, `ifNoneMatch: "<etag>"`) have no native primitive and
  // are emulated with a `head()` pre-check + native ifMatch on the write —
  // best-effort across processes (a delete between check and write would
  // race), but consistent with the fs/lru-cache CAS pattern.
  const writeWithCAS = async (
    key: string,
    write: (putOpts: {
      ifMatch?: string;
      allowOverwrite?: boolean;
    }) => Promise<{ etag: string }>,
    casOpts: { ifMatch?: string; ifNoneMatch?: string },
  ): Promise<{ etag: string }> => {
    const { ifMatch, ifNoneMatch } = casOpts;

    // Atomic create-only: `allowOverwrite: false` is enforced server-side.
    if (ifNoneMatch === "*" && ifMatch === undefined) {
      try {
        return await write({ allowOverwrite: false });
      } catch (err: any) {
        if (isPreconditionOrExistsError(err)) {
          throw new CASMismatchError(DRIVER_NAME, key);
        }
        throw err;
      }
    }

    // Atomic ifMatch:<etag>: forwarded directly to Vercel Blob.
    if (typeof ifMatch === "string" && ifMatch !== "*" && ifNoneMatch === undefined) {
      try {
        return await write({ ifMatch, allowOverwrite: true });
      } catch (err: any) {
        if (isPreconditionOrExistsError(err)) {
          throw new CASMismatchError(DRIVER_NAME, key);
        }
        throw err;
      }
    }

    // Emulated paths (`ifMatch:*`, `ifNoneMatch:<etag>`, or combinations).
    // Best-effort: head() then write. Cross-process races are not prevented.
    const head = await blob
      .head(r(key), { token: getToken() })
      .catch(() => null);
    const exists = !!head;
    const curEtag = head?.etag;

    if (ifNoneMatch !== undefined) {
      if (ifNoneMatch === "*" ? exists : exists && curEtag === ifNoneMatch) {
        throw new CASMismatchError(DRIVER_NAME, key);
      }
    }
    if (ifMatch !== undefined) {
      if (ifMatch === "*" ? !exists : !exists || curEtag !== ifMatch) {
        throw new CASMismatchError(DRIVER_NAME, key);
      }
    }

    // If we have a concrete etag to assert, use native ifMatch for atomicity.
    const putOpts =
      ifMatch && ifMatch !== "*"
        ? { ifMatch, allowOverwrite: true as const }
        : { allowOverwrite: true as const };

    try {
      return await write(putOpts);
    } catch (err: any) {
      if (isPreconditionOrExistsError(err)) {
        throw new CASMismatchError(DRIVER_NAME, key);
      }
      throw err;
    }
  };

  return {
    name: DRIVER_NAME,
    options: opts,
    flags: { cas: true },
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
      const wantsCAS =
        callOpts?.ifMatch !== undefined || callOpts?.ifNoneMatch !== undefined;
      const doPut = (extra: { ifMatch?: string; allowOverwrite?: boolean }) =>
        blob
          .put(r(key), value, {
            access: opts.access,
            addRandomSuffix: false,
            token: getToken(),
            ...callOpts,
            ...extra,
          })
          .then((res) => ({ etag: res.etag }));
      if (wantsCAS) {
        return writeWithCAS(key, doPut, callOpts);
      }
      await doPut({});
    },
    async setItemRaw(key, value, callOpts) {
      const wantsCAS =
        callOpts?.ifMatch !== undefined || callOpts?.ifNoneMatch !== undefined;
      const doPut = (extra: { ifMatch?: string; allowOverwrite?: boolean }) =>
        blob
          .put(r(key), value, {
            access: opts.access,
            addRandomSuffix: false,
            token: getToken(),
            ...callOpts,
            ...extra,
          })
          .then((res) => ({ etag: res.etag }));
      if (wantsCAS) {
        return writeWithCAS(key, doPut, callOpts);
      }
      await doPut({});
    },
    async removeItem(key: string) {
      await blob.del(r(key), { token: getToken() });
    },
    async getKeys(base: string) {
      const blobs: any[] = [];
      let cursor: string | undefined = undefined;
      do {
        const listBlobResult: Awaited<ReturnType<typeof blob.list>> = await blob.list({
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
        blob.pathname.replace(new RegExp(`^${optsBase.replace(/:/g, "/")}/`), ""),
      );
    },
    async clear(base) {
      let cursor: string | undefined = undefined;
      const blobs: any[] = [];
      do {
        const listBlobResult: Awaited<ReturnType<typeof blob.list>> = await blob.list({
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
          },
        );
      }
    },
  };
};

export default driver;

// --- Internal helpers ---

// Detects a CAS-relevant failure from `@vercel/blob`. We avoid `instanceof`
// against the SDK's classes so the check is resilient across SDK versions
// and dual-bundle (ESM/CJS) duplication. Two cases produce a CAS mismatch:
//   - native `BlobPreconditionFailedError` (server-side `ifMatch` rejection)
//   - `allowOverwrite: false` collision (currently surfaced as a generic
//     `BlobError` whose message mentions the conflict)
function isPreconditionOrExistsError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = (err as { name?: string }).name;
  if (name === "BlobPreconditionFailedError") return true;
  const message = (err as { message?: string }).message ?? "";
  return (
    /precondition/i.test(message) ||
    /etag mismatch/i.test(message) ||
    /already exists/i.test(message) ||
    /overwrite/i.test(message)
  );
}
