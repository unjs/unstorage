import { defineDriver } from "./utils";
import Redis, { RedisOptions as _RedisOptions } from "ioredis";

export interface RedisOptions extends _RedisOptions {
  base: string;
  url: string;
}

export default defineDriver<RedisOptions>((_opts) => {
  const opts = { lazyConnect: true, ..._opts };
  const redis = opts.url ? new Redis(opts?.url, opts) : new Redis(opts);

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
      return redis.del(keys.map((key) => r(key))).then(() => {});
    },
    dispose() {
      return redis.disconnect();
    },
  };
});
