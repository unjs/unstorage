import { defineDriver, createError } from "./utils";
import Memcached from "memcached";

export interface MemcachedOptions {
  location?: Memcached.Location;
  options?: Memcached.options;
  defaultTTL?: number;
}

const DRIVER_NAME = "memcached";

export default defineDriver<MemcachedOptions>((opts: MemcachedOptions) => {
  const {
    location = "localhost:11211",
    options = {},
    defaultTTL = 0,
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
          if (err) {
            return reject(err);
          }
          if (typeof data === "undefined"){
            return  resolve(null);
          }
          resolve(data);
        });
      });
    },

    async hasItem(key: string) {
      return await new Promise((resolve, reject) => {
        getMemcached().get(key, (err, data) => {
          if (err) {
            return reject(err);
          }
          resolve(!!data);
        });
      });
    },

    async setItem(key: string, value: string, options) {
      const ttl = options.ttl ?? defaultTTL;
      if (isNaN(ttl))
        throw createError(DRIVER_NAME, `Invalid ttl: ${ttl}. Pass a ttl value in seconds like this : { ttl: 60 }`)
      await new Promise((resolve, reject) => {
        getMemcached().set(key, value, ttl, (err, result) => {
          if (err) {
            return reject(err);
          }
          if (!result) {
            return reject(createError(DRIVER_NAME, "Error while using setItem"));
          }
          resolve(value);
        });
      });
    },

    async removeItem(key) {
      return await new Promise((resolve, reject) => {
        getMemcached().del(key, (err, result) => {
          if (err) {
            return reject(err);
          }
          if (!result) {
            return reject(createError(DRIVER_NAME, "Error while using removeItem"));
          }
          resolve();
        });
      });
    },

    async clear() {
      await new Promise((resolve, reject) => {
        getMemcached().flush((err) => {
          if (err) {
            return reject(err);
          }
          resolve(true);
        });
      });
    },
  };
});
