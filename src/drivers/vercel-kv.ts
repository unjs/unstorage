import { createClient } from "@vercel/kv";
import type { VercelKV } from "@vercel/kv";
import type { RedisConfigNodejs } from "@upstash/redis";

import { defineDriver, normalizeKey, joinKeys } from "./utils";

export interface RedisOptions extends RedisConfigNodejs {
  base?: string;
}

export default defineDriver<RedisOptions>((opts) => {
  const base = normalizeKey(opts?.base);
  const r = (...keys: string[]) => joinKeys(base, ...keys);

  let _connection: VercelKV;
  const getConnection = () => {
    if (!_connection) {
      // `connect` configures a connection class rather than initiating a connection
      _connection = createClient(opts);
    }
    return _connection;
  };

  return {
    hasItem(key) {
      return getConnection().exists(r(key)).then(Boolean);
    },
    getItem(key) {
      return getConnection().get(r(key));
    },
    setItem(key, value) {
      return getConnection()
        .set(r(key), value)
        .then(() => {});
    },
    removeItem(key) {
      return getConnection()
        .del(r(key))
        .then(() => {});
    },
    getKeys(base) {
      return getConnection().keys(r(base, "*"));
    },
    async clear(base) {
      const keys = await getConnection().keys(r(base, "*"));
      if (keys.length === 0) {
        return;
      }
      return getConnection()
        .del(...keys)
        .then(() => {});
    },
  };
});
