import { defineDriver } from "./utils";
import Memcached from "memcached";

export interface MemcachedOptions {
  location?: Memcached.Location;
  options?: Memcached.options;
  defaultLifetime?: number;
}

const DRIVER_NAME = "memcached";

export default defineDriver<MemcachedOptions>((opts: MemcachedOptions) => {
  const {
    location = "localhost:11211",
    options = {},
    defaultLifetime = 0,
  } = opts;

  let memcached: Memcached | undefined;

  const getMemcached = () => {
    if (!memcached) {
      memcached = new Memcached(location, options);
    }
    return memcached;
  };

  return {
    name: DRIVER_NAME,
    options: opts,
    async getKeys() {
      return [];
    },
    async getItem(key) {
      return await new Promise((resolve, reject) => {
        getMemcached().get(key, (err, data) => {
          if (err) reject(err);
          if (typeof data === "undefined") resolve(null);
          resolve(data);
        });
      });
    },

    async hasItem(key: string) {
      return await new Promise((resolve, reject) => {
        getMemcached().get(key, (err, data) => {
          if (err) reject(err);
          resolve(!!data);
        });
      });
    },

    async setItem(key: string, value: string, options) {
      const lifetime = options.lifetime ?? defaultLifetime;
      if (isNaN(lifetime))
        throw new Error(
          `[unstorage-memcached]: Invalid lifetime: ${lifetime}. Pass a lifetime value in seconds like this : { lifetime: 60 }`
        );
      await new Promise((resolve, reject) => {
        getMemcached().set(key, value, lifetime, (err, result) => {
          if (err) reject(err);
          if (!result)
            reject("[unstorage-memcached] Error while using setItem");
          resolve(value);
        });
      });
    },

    async removeItem(key) {
      return await new Promise((resolve, reject) => {
        getMemcached().del(key, (err, result) => {
          if (err) reject(err);
          if (!result)
            reject("[unstorage-memcached] Error while using removeItem");
          resolve();
        });
      });
    },

    async clear() {
      await new Promise((resolve, reject) => {
        getMemcached().flush((err) => {
          if (err) reject(err);
          resolve(true);
        });
      });
    },
  };
});
