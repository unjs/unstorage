import { createClient } from "@vercel/kv";
import type { VercelKV } from "@vercel/kv";
import type { RedisConfigNodejs } from "@upstash/redis";

import { defineDriver, normalizeKey, joinKeys } from "./utils";

export interface VercelKVOptions extends RedisConfigNodejs {
  base?: string;
}

export default defineDriver<VercelKVOptions>((opts) => {
  const base = normalizeKey(opts?.base);
  const r = (...keys: string[]) => joinKeys(base, ...keys);

  let _client: VercelKV;
  const getClient = () => {
    if (!_client  ) {
      _client = createClient(opts);
    }
    return _client;
  };

  return {
    hasItem(key) {
      return getClient().exists(r(key)).then(Boolean);
    },
    getItem(key) {
      return getClient().get(r(key));
    },
    setItem(key, value) {
      return getClient()
        .set(r(key), value)
        .then(() => {});
    },
    removeItem(key) {
      return getClient()
        .del(r(key))
        .then(() => {});
    },
    getKeys(base) {
      return getClient().keys(r(base, "*"));
    },
    async clear(base) {
      const keys = await getClient().keys(r(base, "*"));
      if (keys.length === 0) {
        return;
      }
      return getClient()
        .del(...keys)
        .then(() => {});
    },
  };
});
