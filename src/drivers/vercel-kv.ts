import { createClient } from "@vercel/kv";
import type { RedisConfigNodejs } from "@upstash/redis";

import { defineDriver } from "./utils";

export interface RedisOptions extends RedisConfigNodejs {
  base?: string;
}

export default defineDriver<RedisOptions>((opts) => {
  const redis = createClient(opts);

  let base = opts?.base || "";
  if (base && !base.endsWith(":")) {
    base += ":";
  }
  const r = (key: string) => base + key;

  return {
    hasItem(key) {
      return redis.exists(r(key)).then(Boolean);
    },
    getItem(key) {
      return redis.get(r(key));
    },
    setItem(key, value) {
      return redis.set(r(key), value).then(() => {});
    },
    removeItem(key) {
      return redis.del(r(key)).then(() => {});
    },
    getKeys() {
      return redis.keys(r("*"));
    },
    async clear() {
      const keys = await redis.keys(r("*"));
      if (keys.length === 0) {
        return;
      }
      return redis.del(...keys).then(() => {});
    },
  };
});
