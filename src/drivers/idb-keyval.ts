import { defineDriver } from './utils'
import { get, set, clear, del, keys, createStore, type UseStore } from 'idb-keyval'

export interface IDBKeyvalOptions {
    dbName?: string
    storeName?: string
    base?: string
}

const DRIVER_NAME = "idb-keyval";

export default defineDriver((opts: IDBKeyvalOptions = {}) => {
    let customStore: UseStore | undefined

    if (opts.dbName && opts.storeName) {
        customStore = createStore(opts.dbName, opts.storeName)
    }

    const r = (key: string) => (opts.base ? opts.base + ":" : "") + key;

    return {
        name: DRIVER_NAME,
        options: opts,
        hasItem(key) {
            return get(r(key), customStore).then((item) => (item ?? null) !== null)
        },
        getItem(key) {
            return get(r(key), customStore).then((item) => item ?? null)
        },
        setItem(key, value) {
            return set(r(key), value, customStore)
        },
        removeItem(key) {
            return del(r(key), customStore)
        },
        getKeys() {
            return keys(customStore)
        },
        clear() {
            return clear(customStore)
        },
    }
})
