import { type DriverFactory, createError, normalizeKey } from "./utils/index.ts";
import { CASMismatchError } from "./utils/cas.ts";
import type * as DenoKV from "@deno/kv";

// https://docs.deno.com/deploy/kv/manual/

export interface DenoKvOptions {
  base?: string;
  path?: string;
  openKv?: () => Promise<DenoKV.Kv>;
  /**
   * Default TTL for all items in seconds.
   */
  ttl?: number;
}
interface DenoKVSetOptions {
  /**
   * TTL in seconds.
   */
  ttl?: number;
  ifMatch?: string;
  ifNoneMatch?: string;
}

const DRIVER_NAME = "deno-kv";

const driver: DriverFactory<DenoKvOptions, Promise<DenoKV.Kv>> = (opts) => {
  const basePrefix: DenoKV.KvKey = opts.base ? normalizeKey(opts.base).split(":") : [];

  const r = (key: string = ""): DenoKV.KvKey => [...basePrefix, ...key.split(":")].filter(Boolean);

  let _kv: Promise<DenoKV.Kv> | undefined;
  const getKv = () => {
    if (_kv) {
      return _kv;
    }
    if (opts.openKv) {
      _kv = opts.openKv();
    } else {
      if (!globalThis.Deno) {
        throw createError(
          DRIVER_NAME,
          "Missing global `Deno`. Are you running in Deno? (hint: use `deno-kv-node` driver for Node.js)",
        );
      }
      if (!Deno.openKv) {
        throw createError(
          DRIVER_NAME,
          "Missing `Deno.openKv`. Are you running Deno with --unstable-kv?",
        );
      }
      _kv = Deno.openKv(opts.path) as Promise<DenoKV.Kv>;
    }
    return _kv;
  };

  const setWithCAS = async (
    key: string,
    value: unknown,
    tOptions: DenoKVSetOptions,
  ): Promise<{ etag: string }> => {
    const kv = await getKv();
    const k = r(key);
    const ttl = normalizeTTL(tOptions.ttl ?? opts?.ttl);
    const { ifMatch, ifNoneMatch } = tOptions;

    // Fast path: create-only via versionstamp:null check.
    if (ifNoneMatch === "*" && ifMatch === undefined) {
      const result = await kv
        .atomic()
        .check({ key: k, versionstamp: null })
        .set(k, value, { expireIn: ttl })
        .commit();
      if (!result.ok) {
        throw new CASMismatchError(DRIVER_NAME, key);
      }
      return { etag: result.versionstamp };
    }

    // General path: read current versionstamp, validate preconditions, then
    // atomic check+set on that versionstamp to detect races.
    const cur = await kv.get(k);
    const exists = cur.value !== null;
    const curEtag = exists ? cur.versionstamp : undefined;

    let mismatch = false;
    if (ifNoneMatch !== undefined) {
      mismatch = ifNoneMatch === "*" ? exists : exists && curEtag === ifNoneMatch;
    }
    if (!mismatch && ifMatch !== undefined) {
      mismatch = ifMatch === "*" ? !exists : !exists || curEtag !== ifMatch;
    }
    if (mismatch) {
      throw new CASMismatchError(DRIVER_NAME, key);
    }

    const result = await kv
      .atomic()
      .check({ key: k, versionstamp: curEtag ?? null })
      .set(k, value, { expireIn: ttl })
      .commit();
    if (!result.ok) {
      throw new CASMismatchError(DRIVER_NAME, key);
    }
    return { etag: result.versionstamp };
  };

  return {
    name: DRIVER_NAME,
    flags: { cas: true },
    getInstance() {
      return getKv();
    },
    async hasItem(key) {
      const kv = await getKv();
      const value = await kv.get(r(key));
      return !!value.value;
    },
    async getItem(key) {
      const kv = await getKv();
      const value = await kv.get(r(key));
      return value.value;
    },
    async getItemRaw(key) {
      const kv = await getKv();
      const value = await kv.get(r(key));
      return value.value;
    },
    async getMeta(key) {
      const kv = await getKv();
      const entry = await kv.get(r(key));
      return entry.value === null ? null : { etag: entry.versionstamp };
    },
    async setItem(key, value, tOptions: DenoKVSetOptions) {
      if (tOptions?.ifMatch !== undefined || tOptions?.ifNoneMatch !== undefined) {
        return setWithCAS(key, value, tOptions);
      }
      const ttl = normalizeTTL(tOptions?.ttl ?? opts?.ttl);
      const kv = await getKv();
      await kv.set(r(key), value, { expireIn: ttl });
    },
    async setItemRaw(key, value, tOptions: DenoKVSetOptions) {
      if (tOptions?.ifMatch !== undefined || tOptions?.ifNoneMatch !== undefined) {
        return setWithCAS(key, value, tOptions);
      }
      const ttl = normalizeTTL(tOptions?.ttl ?? opts?.ttl);
      const kv = await getKv();
      await kv.set(r(key), value, { expireIn: ttl });
    },
    async removeItem(key) {
      const kv = await getKv();
      await kv.delete(r(key));
    },
    async getKeys(base) {
      const kv = await getKv();
      const keys: string[] = [];
      for await (const entry of kv.list({ prefix: r(base) })) {
        keys.push(
          (basePrefix.length > 0 ? entry.key.slice(basePrefix.length) : entry.key).join(":"),
        );
      }
      return keys;
    },
    async clear(base) {
      const kv = await getKv();
      const batch = kv.atomic();
      for await (const entry of kv.list({ prefix: r(base) })) {
        batch.delete(entry.key as DenoKV.KvKey);
      }
      await batch.commit();
    },
    async dispose() {
      if (_kv) {
        const kv = await _kv;
        await kv.close();
        _kv = undefined;
      }
    },
  };
};

// --- internal ---

/**
 * Converts TTL from seconds to milliseconds.
 * @see https://docs.deno.com/deploy/kv/manual/key_expiration/
 */
function normalizeTTL(ttl: number | undefined): number | undefined {
  return typeof ttl === "number" && ttl > 0 ? ttl * 1000 : undefined;
}

export default driver;
