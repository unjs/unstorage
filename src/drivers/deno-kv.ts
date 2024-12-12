import { normalizeKey } from "../utils";
import { defineDriver, createError } from "./utils/index";

// https://docs.deno.com/deploy/kv/manual/

export interface DenoKvOptions {
  base?: string;
  path?: string;
}

const DRIVER_NAME = "deno-kv";

export default defineDriver<DenoKvOptions, Promise<Deno.Kv>>(
  (opts: DenoKvOptions = {}) => {
    const basePrefix: Deno.KvKey = opts.base
      ? normalizeKey(opts.base).split(":")
      : [];

    const r = (key: string = ""): Deno.KvKey =>
      [...basePrefix, ...key.split(":")].filter(Boolean);

    let _client: Promise<Deno.Kv> | undefined;
    const getKv = async () => {
      if (_client) {
        return _client;
      }
      if (!globalThis.Deno) {
        throw createError(
          DRIVER_NAME,
          "Missing global `Deno`. Are you running in Deno?"
        );
      }
      if (!Deno.openKv) {
        throw createError(
          DRIVER_NAME,
          "Missing `Deno.openKv`. Are you running Deno with --unstable-kv?"
        );
      }
      _client = Deno.openKv(opts.path);
      return _client;
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
          keys.push(entry.key.join(":"));
        }
        return keys;
      },
      async clear(base) {
        const kv = await getKv();
        const promisePool: Promise<void>[] = [];
        for await (const entry of kv.list({ prefix: r(base) })) {
          promisePool.push(kv.delete(entry.key));
        }
        await Promise.all(promisePool);
      },
      dispose() {
        if (_client) {
          return _client.then((kv) => {
            kv.close();
            _client = undefined;
          });
        }
      },
    };
  }
);
