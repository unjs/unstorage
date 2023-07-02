import { defineDriver } from "./utils";
import Memcached from "memcached";

export interface MemcachedOpts {
  serverLocation: Memcached.Location;
  connectionOptions: Memcached.options;
}

export default defineDriver<MemcachedOpts>((_opts: MemcachedOpts) => {
  const memcached = new Memcached(
    _opts.serverLocation || "localhost:11211",
    _opts.connectionOptions || {}
  );
  return {
    async getKeys() {
      console.error(
        "[unstorage-memcached] getKeys isn't implemented with memcached."
      );
      return [];
    },

    async getItem(key) {
      return await new Promise((resolve, reject) => {
        memcached.get(key, (err, data) => {
          if (err) reject(err);
          if (typeof data === "undefined") resolve(null);
          resolve(data);
        });
      });
    },

    async hasItem(key: string) {
      return await new Promise((resolve, reject) => {
        memcached.get(key, (err, data) => {
          if (err) reject(err);
          resolve(!!data);
        });
      });
    },

    async setItem(key: string, value: string, options) {
      const lifetime = options.lifetime ?? 0;
      if (isNaN(lifetime))
        throw new Error(
          `[unstorage-memcached]: Invalid lifetime: ${lifetime}. Pass a lifetime value in seconds like this : { lifetime: 60 }`
        );
      await new Promise((resolve, reject) => {
        memcached.set(key, value, lifetime, (err, result) => {
          if (err) reject(err);
          if (!result)
            reject("[unstorage-memcached] Error while using setItem");
          resolve(value);
        });
      });
    },

    async removeItem(key) {
      return await new Promise((resolve, reject) => {
        memcached.del(key, (err, result) => {
          if (err) reject(err);
          if (!result)
            reject("[unstorage-memcached] Error while using removeItem");
          resolve();
        });
      });
    },

    async clear() {
      await new Promise((resolve, reject) => {
        memcached.flush((err) => {
          if (err) reject(err);
          resolve(true);
        });
      });
    },
  };
});
