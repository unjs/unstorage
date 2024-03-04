import { defineDriver } from "./utils";
import type { Kv } from "@deno/kv";
import { openKv } from "@deno/kv";
import { normalizeKey } from "../utils";
import { flattenAsyncIterable } from "./utils/deno-kv";

export interface DenoKVOptions {
  path?: string;
  prefix?: string;
  accessToken?: string;
}

const DRIVER_NAME = "deno-kv";

export default defineDriver<DenoKVOptions>((options: DenoKVOptions = {}) => {
  const { path, prefix: _prefix, accessToken: _accessToken } = options;
  const prefix = normalizeKey(_prefix ? _prefix : "").split(":");
  const accessToken = _accessToken ? _accessToken : undefined;
  let _client: Kv | undefined;

  const getClient = async (): Promise<Kv> => {
    if (!_client) {
      _client = await openKv(path, {
        accessToken,
      });
    }
    return _client;
  };

  const r = (key: string): string[] => [...prefix, ...key.split(":")];
  const t = (key: readonly string[]): string =>
    key.slice(prefix.length).join(":");
  async function allKeys(kv: Kv) {
    const keys = (await flattenAsyncIterable(kv.list({ prefix }))).map(
      (response) => response.key
    );
    return keys;
  }
  return {
    name: DRIVER_NAME,
    options,
    async hasItem(key) {
      const kv = await getClient();
      const res = await kv.get(r(key));
      return !!res.value;
    },
    async getItem(key) {
      const kv = await getClient();
      const res = await kv.get(r(key));
      return res.value;
    },
    async setItem(key, value) {
      const kv = await getClient();
      await kv.set(r(key), value);
    },
    async removeItem(key) {
      const kv = await getClient();
      await kv.delete(r(key));
    },
    async getKeys() {
      const kv = await getClient();
      const keys = await allKeys(kv);
      // @ts-ignore They will be strings.
      return keys.map(t);
    },
    async clear() {
      const kv = await getClient();
      const keys = await allKeys(kv);
      const tx = kv.atomic();
      keys.forEach((key) => tx.delete(key));
      await tx.commit();
    },
    dispose() {
      if (_client) {
        _client.close();
      }
    },
  };
});
