import { createError, defineDriver, joinKeys } from "./utils";
import { Redis, type RedisConfigNodejs } from "@upstash/redis";

export interface UpstashRedisOptions extends Partial<RedisConfigNodejs> {
  /**
   * Optional prefix to use for all keys. Can be used for namespacing.
   */
  base?: string;

  /**
   * Optional flag to customize environment variable prefix (Default is `UPSTASH_REDIS_REST`).
   */
  envPrefix?: false | string;

  /**
   * Default TTL for all items in seconds.
   */
  ttl?: number;
}

const DRIVER_NAME = "upstash";

const validate = (option: string | undefined, envOption: string): string => {
  if (option) {
    return option;
  }
  const env = process.env[envOption];
  if (env) {
    return env;
  }
  throw createError(
    DRIVER_NAME,
    `missing required option or environment variable '${envOption}'.`
  );
};
export default defineDriver((opts: UpstashRedisOptions = {}) => {
  let redisClient: Redis;

  const getRedisClient = () => {
    if (redisClient) {
      return redisClient;
    }
    const envPrefix = opts.envPrefix || "UPSTASH_REDIS_REST";
    const url = validate(opts.url, `${envPrefix}_URL`);
    const token = validate(opts.token, `${envPrefix}_TOKEN`);
    redisClient = new Redis({ url, token });
    return redisClient;
  };

  const base = (opts.base || "").replace(/:$/, "");
  const p = (...keys: string[]) => joinKeys(base, ...keys);
  return {
    name: DRIVER_NAME,
    options: opts,
    async hasItem(key) {
      return Boolean(await getRedisClient().exists(p(key)));
    },
    async getItem(key) {
      return getRedisClient().get(p(key));
    },
    async setItem(key, value, tOptions) {
      let ttl = tOptions?.ttl ?? opts.ttl;
      await getRedisClient().set(p(key), value, ttl ? { ex: ttl } : undefined);
    },
    async removeItem(key) {
      await getRedisClient().del(p(key));
    },
    async getKeys(base) {
      return getRedisClient().keys(p(base, "*"));
    },
    async clear(base) {
      const keys = await getRedisClient().keys(p(base, "*"));
      if (keys.length === 0) {
        return;
      }
      await getRedisClient().del(...keys);
    },
  };
});
