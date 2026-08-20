import { destr } from "destr";
import type {
  Storage,
  Driver,
  GetItemOptions,
  GetItemType,
  WatchCallback,
  Unwatch,
  StorageValue,
  WatchEvent,
  TransactionOptions,
} from "./types.ts";
import memory from "./drivers/memory.ts";
import {
  asyncCall,
  deserializeRaw,
  serializeRaw,
  stringify,
  toBlob,
  toBytes,
  toStream,
} from "./_utils.ts";
import {
  normalizeKey,
  normalizeBaseKey,
  joinKeys,
  filterKeyByDepth,
  filterKeyByBase,
} from "./utils.ts";

interface StorageCTX {
  mounts: Record<string, Driver>;
  mountpoints: string[];
  watching: boolean;
  unwatch: Record<string, Unwatch>;
  watchListeners: ((event: WatchEvent, key: string) => void)[];
}

export interface CreateStorageOptions {
  driver?: Driver;
}

/** Types that are read from the driver's raw value instead of its serialized one. */
type RawItemType = Extract<GetItemType, "bytes" | "blob" | "stream">;

function isRawType(type: unknown): type is RawItemType {
  return type === "bytes" || type === "blob" || type === "stream";
}

/** Converts a deserialized driver value to the requested `text`/`json` type. */
function toValueType(value: StorageValue, type: GetItemType | undefined): StorageValue {
  if (value === null || value === undefined) {
    return null;
  }
  if (type === "text") {
    return typeof value === "string" ? value : stringify(value);
  }
  // `json` is intentionally lenient (same as the default): values are stored with
  // `stringify()` which keeps strings bare, so `JSON.parse` would throw on them.
  return destr(value) as StorageValue;
}

/** Reads a single key from a driver and converts it to the `type` given in `opts`. */
async function getTypedItem(
  driver: Driver,
  relativeKey: string,
  opts: GetItemOptions = {},
): Promise<StorageValue> {
  const type = opts.type;

  if (isRawType(type)) {
    const raw = driver.getItemRaw
      ? await asyncCall(driver.getItemRaw, relativeKey, opts)
      : deserializeRaw(await asyncCall(driver.getItem, relativeKey, opts));
    if (raw === null || raw === undefined) {
      return null;
    }
    switch (type) {
      case "bytes": {
        return await toBytes(raw);
      }
      case "blob": {
        return await toBlob(raw);
      }
      case "stream": {
        return await toStream(raw);
      }
    }
  }

  return toValueType(await asyncCall(driver.getItem, relativeKey, opts), type);
}

export function createStorage<T extends StorageValue>(
  options: CreateStorageOptions = {},
): Storage<T> {
  const context: StorageCTX = {
    mounts: { "": options.driver || memory() },
    mountpoints: [""],
    watching: false,
    watchListeners: [],
    unwatch: {},
  };

  const getMount = (key: string) => {
    for (const base of context.mountpoints) {
      if (key.startsWith(base)) {
        return {
          base,
          relativeKey: key.slice(base.length),
          driver: context.mounts[base]!,
        };
      }
    }
    return {
      base: "",
      relativeKey: key,
      driver: context.mounts[""]!,
    };
  };

  const getMounts = (base: string, includeParent?: boolean) => {
    return context.mountpoints
      .filter(
        (mountpoint) =>
          mountpoint.startsWith(base) || (includeParent && base!.startsWith(mountpoint)),
      )
      .map((mountpoint) => ({
        relativeBase: base.length > mountpoint.length ? base!.slice(mountpoint.length) : undefined,
        mountpoint,
        driver: context.mounts[mountpoint]!,
      }));
  };

  const onChange: WatchCallback = (event, key) => {
    if (!context.watching) {
      return;
    }
    key = normalizeKey(key);
    for (const listener of context.watchListeners) {
      listener(event, key);
    }
  };

  const startWatch = async () => {
    if (context.watching) {
      return;
    }
    context.watching = true;
    for (const mountpoint in context.mounts) {
      context.unwatch[mountpoint] = await watch(context.mounts[mountpoint]!, onChange, mountpoint);
    }
  };

  const stopWatch = async () => {
    if (!context.watching) {
      return;
    }
    for (const mountpoint in context.unwatch) {
      await context.unwatch[mountpoint]!();
    }
    context.unwatch = {};
    context.watching = false;
  };

  type BatchItem = {
    driver: Driver;
    base: string;
    items: {
      key: string;
      relativeKey: string;
      value?: StorageValue;
      options?: TransactionOptions;
    }[];
  };

  const runBatch = (
    items: (string | { key: string; value?: StorageValue; options?: TransactionOptions })[],
    commonOptions: undefined | TransactionOptions,
    cb: (batch: BatchItem) => Promise<any>,
  ) => {
    const batches = new Map<string /* mount base */, BatchItem>();
    const getBatch = (mount: ReturnType<typeof getMount>) => {
      let batch = batches.get(mount.base);
      if (!batch) {
        batch = {
          driver: mount.driver,
          base: mount.base,
          items: [],
        };
        batches.set(mount.base, batch);
      }
      return batch;
    };

    for (const item of items) {
      const isStringItem = typeof item === "string";
      const key = normalizeKey(isStringItem ? item : item.key);
      const value = isStringItem ? undefined : item.value;
      const options =
        isStringItem || !item.options ? commonOptions : { ...commonOptions, ...item.options };
      const mount = getMount(key);
      getBatch(mount).items.push({
        key,
        value,
        relativeKey: mount.relativeKey,
        options,
      });
    }

    return Promise.all([...batches.values()].map((batch) => cb(batch))).then((r) => r.flat());
  };

  const storage: Storage = {
    // Item
    hasItem(key: string, opts = {}) {
      key = normalizeKey(key);
      const { relativeKey, driver } = getMount(key);
      return asyncCall(driver.hasItem, relativeKey, opts);
    },
    getItem: (key: string, opts: TransactionOptions = {}) => {
      key = normalizeKey(key);
      const { relativeKey, driver } = getMount(key);
      return getTypedItem(driver, relativeKey, opts);
    },
    getItems(
      items: (string | { key: string; options?: TransactionOptions })[],
      commonOptions = {},
    ) {
      return runBatch(items, commonOptions, async (batch) => {
        if (!batch.driver.getItems) {
          return Promise.all(
            batch.items.map(async (item) => ({
              key: item.key,
              value: await getTypedItem(batch.driver, item.relativeKey, item.options),
            })),
          );
        }

        // `bytes`, `blob` and `stream` read the driver's raw value, which has no batch
        // equivalent, so they are resolved one by one alongside the batch call.
        const rawItems = batch.items.filter((item) => isRawType(item.options?.type));
        const plainItems =
          rawItems.length === 0
            ? batch.items
            : batch.items.filter((item) => !isRawType(item.options?.type));

        const [plain, raw] = await Promise.all([
          plainItems.length === 0
            ? []
            : asyncCall(
                batch.driver.getItems,
                plainItems.map((item) => ({
                  key: item.relativeKey,
                  options: item.options,
                })),
                commonOptions,
              ).then((r) => {
                const types = new Map(
                  plainItems.map((item) => [item.relativeKey, item.options?.type]),
                );
                return r.map((item) => ({
                  key: joinKeys(batch.base, item.key),
                  value: toValueType(item.value, types.get(item.key)),
                }));
              }),
          Promise.all(
            rawItems.map(async (item) => ({
              key: item.key,
              value: await getTypedItem(batch.driver, item.relativeKey, item.options),
            })),
          ),
        ]);

        return [...plain, ...raw];
      });
    },
    getItemRaw(key, opts = {}) {
      key = normalizeKey(key);
      const { relativeKey, driver } = getMount(key);
      if (driver.getItemRaw) {
        return asyncCall(driver.getItemRaw, relativeKey, opts);
      }
      return asyncCall(driver.getItem, relativeKey, opts).then((value) => deserializeRaw(value));
    },
    async setItem(key: string, value: T, opts = {}) {
      if (value === undefined) {
        return storage.removeItem(key);
      }
      key = normalizeKey(key);
      const { relativeKey, driver } = getMount(key);
      if (!driver.setItem) {
        return; // Readonly
      }
      await asyncCall(driver.setItem, relativeKey, stringify(value), opts);
      if (!driver.watch) {
        onChange("update", key);
      }
    },
    async setItems(items, commonOptions) {
      await runBatch(items, commonOptions, async (batch) => {
        if (batch.driver.setItems) {
          return asyncCall(
            batch.driver.setItems,
            batch.items.map((item) => ({
              key: item.relativeKey,
              value: stringify(item.value),
              options: item.options,
            })),
            commonOptions,
          );
        }
        if (!batch.driver.setItem) {
          return;
        }
        await Promise.all(
          batch.items.map((item) => {
            return asyncCall(
              batch.driver.setItem!,
              item.relativeKey,
              stringify(item.value),
              item.options,
            );
          }),
        );
      });
    },
    async setItemRaw(key, value, opts = {}) {
      if (value === undefined) {
        return storage.removeItem(key, opts);
      }
      key = normalizeKey(key);
      const { relativeKey, driver } = getMount(key);
      if (driver.setItemRaw) {
        await asyncCall(driver.setItemRaw, relativeKey, value, opts);
      } else if (driver.setItem) {
        await asyncCall(driver.setItem, relativeKey, serializeRaw(value), opts);
      } else {
        return; // Readonly
      }
      if (!driver.watch) {
        onChange("update", key);
      }
    },
    async removeItem(
      key: string,
      opts: (TransactionOptions & { removeMeta?: boolean }) | boolean /* legacy: removeMeta */ = {},
    ) {
      // TODO: Remove in next major version
      if (typeof opts === "boolean") {
        opts = { removeMeta: opts };
      }
      key = normalizeKey(key);
      const { relativeKey, driver } = getMount(key);
      if (!driver.removeItem) {
        return; // Readonly
      }
      await asyncCall(driver.removeItem, relativeKey, opts);
      if (opts.removeMeta || opts.removeMata /* #281 */) {
        await asyncCall(driver.removeItem, relativeKey + "$", opts);
      }
      if (!driver.watch) {
        onChange("remove", key);
      }
    },
    // Meta
    async getMeta(key, opts = {}) {
      // TODO: Remove in next major version
      if (typeof opts === "boolean") {
        opts = { nativeOnly: opts };
      }
      key = normalizeKey(key);
      const { relativeKey, driver } = getMount(key);
      const meta = Object.create(null);
      if (driver.getMeta) {
        Object.assign(meta, await asyncCall(driver.getMeta, relativeKey, opts));
      }
      if (!opts.nativeOnly) {
        const value = await asyncCall(driver.getItem, relativeKey + "$", opts).then((value_) =>
          destr<any>(value_),
        );
        if (value && typeof value === "object") {
          // TODO: Support date by destr?
          if (typeof value.atime === "string") {
            value.atime = new Date(value.atime);
          }
          if (typeof value.mtime === "string") {
            value.mtime = new Date(value.mtime);
          }
          Object.assign(meta, value);
        }
      }
      return meta;
    },
    setMeta(key: string, value: any, opts = {}) {
      return this.setItem(key + "$", value, opts);
    },
    removeMeta(key: string, opts = {}) {
      return this.removeItem(key + "$", opts);
    },
    // Keys
    async getKeys(base, opts = {}) {
      base = normalizeBaseKey(base);
      const mounts = getMounts(base, true);
      let maskedMounts: string[] = [];
      const allKeys: string[] = [];
      let allMountsSupportMaxDepth = true;
      for (const mount of mounts) {
        if (!mount.driver.flags?.maxDepth) {
          allMountsSupportMaxDepth = false;
        }
        const rawKeys = await asyncCall(mount.driver.getKeys, mount.relativeBase, opts);
        for (const key of rawKeys) {
          const fullKey = mount.mountpoint + normalizeKey(key);
          if (!maskedMounts.some((p) => fullKey.startsWith(p))) {
            allKeys.push(fullKey);
          }
        }

        // When /mnt/foo is processed, any key in /mnt with /mnt/foo prefix should be masked
        // Using filter to improve performance. /mnt mask already covers /mnt/foo
        maskedMounts = [
          mount.mountpoint,
          ...maskedMounts.filter((p) => !p.startsWith(mount.mountpoint)),
        ];
      }
      const shouldFilterByDepth = opts.maxDepth !== undefined && !allMountsSupportMaxDepth;
      return allKeys.filter(
        (key) =>
          (!shouldFilterByDepth || filterKeyByDepth(key, opts.maxDepth)) &&
          filterKeyByBase(key, base),
      );
    },
    // Utils
    async clear(base, opts = {}) {
      base = normalizeBaseKey(base);
      await Promise.all(
        getMounts(base, false).map(async (m) => {
          if (m.driver.clear) {
            return asyncCall(m.driver.clear, m.relativeBase, opts);
          }
          // Fallback to remove all keys if clear not implemented
          if (m.driver.removeItem) {
            const keys = await m.driver.getKeys(m.relativeBase || "", opts);
            return Promise.all(keys.map((key) => m.driver.removeItem!(key, opts)));
          }
          // Readonly
        }),
      );
    },
    async dispose() {
      await Promise.all(Object.values(context.mounts).map((driver) => dispose(driver)));
    },
    async watch(callback) {
      await startWatch();
      context.watchListeners.push(callback);
      return async () => {
        context.watchListeners = context.watchListeners.filter((listener) => listener !== callback);
        if (context.watchListeners.length === 0) {
          await stopWatch();
        }
      };
    },
    async unwatch() {
      context.watchListeners = [];
      await stopWatch();
    },
    // Mount
    mount(base, driver) {
      base = normalizeBaseKey(base);
      if (base && context.mounts[base]) {
        throw new Error(`already mounted at ${base}`);
      }
      if (base) {
        context.mountpoints.push(base);
        context.mountpoints.sort((a, b) => b.length - a.length);
      }
      context.mounts[base] = driver;
      if (context.watching) {
        Promise.resolve(watch(driver, onChange, base))
          .then((unwatcher) => {
            context.unwatch[base] = unwatcher;
          })
          .catch(console.error);
      }
      return storage;
    },
    async unmount(base: string, _dispose = true) {
      base = normalizeBaseKey(base);
      if (!base /* root */ || !context.mounts[base]) {
        return;
      }
      if (context.watching && base in context.unwatch) {
        context.unwatch[base]?.();
        delete context.unwatch[base];
      }
      if (_dispose) {
        await dispose(context.mounts[base]!);
      }
      context.mountpoints = context.mountpoints.filter((key) => key !== base);
      delete context.mounts[base];
    },
    getMount(key = "") {
      key = normalizeKey(key) + ":";
      const m = getMount(key);
      return {
        driver: m.driver,
        base: m.base,
      };
    },
    getMounts(base = "", opts = {}) {
      base = normalizeKey(base);
      const mounts = getMounts(base, opts.parents);
      return mounts.map((m) => ({
        driver: m.driver,
        base: m.mountpoint,
      }));
    },
    // Aliases
    keys: (base, opts = {}) => storage.getKeys(base, opts),
    get: (key: string, opts: TransactionOptions = {}) => storage.getItem(key, opts),
    set: (key: string, value: T, opts = {}) => storage.setItem(key, value, opts),
    has: (key: string, opts = {}) => storage.hasItem(key, opts),
    del: (key: string, opts = {}) => storage.removeItem(key, opts),
    remove: (key: string, opts = {}) => storage.removeItem(key, opts),
  };

  return storage as unknown as Storage<T>;
}

export type Snapshot<T = string> = Record<string, T>;

export async function snapshot(storage: Storage, base: string): Promise<Snapshot<string>> {
  base = normalizeBaseKey(base);
  const keys = await storage.getKeys(base);
  const snapshot: any = {};
  await Promise.all(
    keys.map(async (key) => {
      snapshot[key.slice(base.length)] = await storage.getItem(key);
    }),
  );
  return snapshot;
}

export async function restoreSnapshot(
  driver: Storage,
  snapshot: Snapshot<StorageValue>,
  base = "",
): Promise<void> {
  base = normalizeBaseKey(base);
  await Promise.all(Object.entries(snapshot).map((e) => driver.setItem(base + e[0], e[1])));
}

function watch(driver: Driver, onChange: WatchCallback, base: string) {
  return driver.watch ? driver.watch((event, key) => onChange(event, base + key)) : () => {};
}

async function dispose(driver: Driver) {
  if (typeof driver.dispose === "function") {
    await asyncCall(driver.dispose);
  }
}
