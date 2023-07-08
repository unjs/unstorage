import { defineDriver, createError } from "./utils/index";
import type { DenoKv, DenoGlobal } from "./utils/deno-kv";
import { flattenAsyncIterable } from "./utils/deno-kv";

export interface DenoKvOptions {
  path?: string;
  prefix?: string[];
}

declare global {
  const Deno: DenoGlobal;
}

export default defineDriver<DenoKvOptions>(({ path, prefix }: DenoKvOptions) => {
  const r = (key: string) => [...(prefix) ? prefix : [], key];

  let _client: DenoKv;

  const getClient = async () => {
    if (typeof Deno === "undefined") {
      throw createError(
        "deno-kv",
        "missing required `Deno` global object. Are you running in Deno?"
      );
    }
    if (!_client) {
      _client = await Deno.openKv(path);
    }
    return _client;
  };

  const removeItem = (key: string) =>
    getClient()
      .then((client) => client.delete(r(key)))
      .then(() => {});

  const getKeys = () =>
    getClient()
      .then((client) => client.list({ prefix }))
      .then(flattenAsyncIterable)
      .then((keys) => keys.map(({ key }) => (key as string[]).at(-1)));

  return {
    hasItem(key) {
      return getClient()
        .then((client) => client.get(r(key)))
        .then((value) => !!value.value);
    },
    getItem(key) {
      return getClient()
        .then((client) => client.get(r(key)))
        .then((value) => value.value);
    },
    setItem(key, value) {
      return getClient()
        .then((client) => client.set(r(key), value))
        .then(() => {});
    },
    removeItem(key) {
      return removeItem(key);
    },
    getKeys() {
      return getKeys();
    },
    async clear() {
      const keys = await getKeys();
      if (keys.length === 0) {
        return;
      }
      const promisePool = keys.map((key) => removeItem(key));
      await Promise.all(promisePool);
    },
  };
});
