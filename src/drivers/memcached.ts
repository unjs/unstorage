import { defineDriver } from "./utils";
import Memcached from 'memcached';

export interface MemcachedOpts {
    serverLocation: Memcached.Location;
    connectionOptions: Memcached.options;
}


export default defineDriver<MemcachedOpts>((_opts : MemcachedOpts) => {
    //@ts-ignore-next-line
    const memcached = new Memcached(_opts.serverLocation || 'localhost:11211', _opts.connectionOptions || {});
    return {
        async getItem(key) {
            return await new Promise((resolve, reject) => {
                memcached.get(key, (err, data) => {
                    if (err) reject(err);
                    resolve(data);
                })
            });
        },


        async hasItem(key: string) {
            return await new Promise((resolve, reject) => {
                memcached.get(key, (err, data) => {
                    if (err) reject(err);
                    resolve(data || false);
                })
            });
        },


        async setItem(key: string, value: string, lifetime: number | undefined) {
            if (lifetime === undefined) throw new Error('Lifetime must be a number when using memcached!');
            return await new Promise((resolve, reject) => {
                memcached.set(key, value, lifetime, (err, result) => {
                    if (err) reject(err);
                    if (!result) reject('Failed');
                    resolve();
                });
            });
        },

        async removeItem(key) {
            return await new Promise((resolve, reject) => {
                memcached.del(key, (err, result) => {
                    if (err) reject(err);
                    if (!result) reject('Failed');
                    resolve();
                })
            })
        },
    }
});