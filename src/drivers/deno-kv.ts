import { defineDriver, createError, normalizeKey } from "./utils/index";
import type { Kv, KvKey } from "@deno/kv";

// https://docs.deno.com/deploy/kv/manual/

export interface DenoKvOptions {
  base?: string;
  path?: string;
  openKv?: () => Promise<Deno.Kv | Kv>;
}

const DRIVER_NAME = "deno-kv";

export default defineDriver<DenoKvOptions, Promise<Deno.Kv | Kv>>(
  (opts: DenoKvOptions = {}) => {
    const basePrefix: KvKey = opts.base
      ? normalizeKey(opts.base).split(":")
      : [];

    const r = (key: string = ""): KvKey =>
      [...basePrefix, ...key.split(":")].filter(Boolean);

    let _kv: Promise<Kv | Deno.Kv> | undefined;
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
            "Missing global `Deno`. Are you running in Deno? (hint: use `deno-kv-node` driver for Node.js)"
          );
        }
        if (!Deno.openKv) {
          throw createError(
            DRIVER_NAME,
            "Missing `Deno.openKv`. Are you running Deno with --unstable-kv?"
          );
        }
        _kv = Deno.openKv(opts.path);
      }
      return _kv;
    };

    return {
      name: DRIVER_NAME,
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
      async setItem(key, value) {
        const kv = await getKv();
        await kv.set(r(key), value);
      },
      async setItemRaw(key, value) {
        const kv = await getKv();
        await kv.set(r(key), value);
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
            (basePrefix.length > 0
              ? entry.key.slice(basePrefix.length)
              : entry.key
            ).join(":")
          );
        }
        return keys;
      },
      async clear(base) {
        const kv = await getKv();
        const batch = kv.atomic();
        for await (const entry of kv.list({ prefix: r(base) })) {
          batch.delete(entry.key as KvKey);
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
  }
);
