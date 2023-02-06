import destr from "destr";
import type {
  Storage,
  Driver,
  WatchCallback,
  Unwatch,
  StorageValue,
  WatchEvent,
} from "./types";
import memory from "./drivers/memory";
import { asyncCall, deserializeRaw, serializeRaw, stringify } from "./_utils";
import { normalizeKey, normalizeBaseKey } from "./utils";

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

export function createStorage(options: CreateStorageOptions = {}): Storage {
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
          relativeKey: key.slice(base.length),
          driver: context.mounts[base],
        };
      }
    }
    return {
      relativeKey: key,
      driver: context.mounts[""],
    };
  };

  const getMounts = (base: string, includeParent: boolean) => {
    return context.mountpoints
      .filter(
        (mountpoint) =>
          mountpoint.startsWith(base) ||
          (includeParent && base!.startsWith(mountpoint))
      )
      .map((mountpoint) => ({
        relativeBase:
          base.length > mountpoint.length
            ? base!.slice(mountpoint.length)
            : undefined,
        mountpoint,
        driver: context.mounts[mountpoint],
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
      context.unwatch[mountpoint] = await watch(
        context.mounts[mountpoint],
        onChange,
        mountpoint
      );
    }
  };

  const stopWatch = async () => {
    if (!context.watching) {
      return;
    }
    for (const mountpoint in context.unwatch) {
      await context.unwatch[mountpoint]();
    }
    context.unwatch = {};
    context.watching = false;
  };

  const storage: Storage = {
    // Item
    hasItem(key) {
      key = normalizeKey(key);
      const { relativeKey, driver } = getMount(key);
      return asyncCall(driver.hasItem, relativeKey);
    },
    getItem(key) {
      key = normalizeKey(key);
      const { relativeKey, driver } = getMount(key);
      return asyncCall(driver.getItem, relativeKey).then((value) =>
        destr(value)
      );
    },
    getItemRaw(key) {
      key = normalizeKey(key);
      const { relativeKey, driver } = getMount(key);
      if (driver.getItemRaw) {
        return asyncCall(driver.getItemRaw, relativeKey);
      }
      return asyncCall(driver.getItem, relativeKey).then((value) =>
        deserializeRaw(value)
      );
    },
    async setItem(key, value) {
      if (value === undefined) {
        return storage.removeItem(key);
      }
      key = normalizeKey(key);
      const { relativeKey, driver } = getMount(key);
      if (!driver.setItem) {
        return; // Readonly
      }
      await asyncCall(driver.setItem, relativeKey, stringify(value));
      if (!driver.watch) {
        onChange("update", key);
      }
    },
    async setItemRaw(key, value) {
      if (value === undefined) {
        return storage.removeItem(key);
      }
      key = normalizeKey(key);
      const { relativeKey, driver } = getMount(key);
      if (driver.setItemRaw) {
        await asyncCall(driver.setItemRaw, relativeKey, value);
      } else if (driver.setItem) {
        await asyncCall(driver.setItem, relativeKey, serializeRaw(value));
      } else {
        return; // Readonly
      }
      if (!driver.watch) {
        onChange("update", key);
      }
    },
    async removeItem(key, removeMeta = true) {
      key = normalizeKey(key);
      const { relativeKey, driver } = getMount(key);
      if (!driver.removeItem) {
        return; // Readonly
      }
      await asyncCall(driver.removeItem, relativeKey);
      if (removeMeta) {
        await asyncCall(driver.removeItem, relativeKey + "$");
      }
      if (!driver.watch) {
        onChange("remove", key);
      }
    },
    // Meta
    async getMeta(key, nativeMetaOnly) {
      key = normalizeKey(key);
      const { relativeKey, driver } = getMount(key);
      const meta = Object.create(null);
      if (driver.getMeta) {
        Object.assign(meta, await asyncCall(driver.getMeta, relativeKey));
      }
      if (!nativeMetaOnly) {
        const value = await asyncCall(driver.getItem, relativeKey + "$").then(
          (value_) => destr(value_)
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
    setMeta(key: string, value: any) {
      return this.setItem(key + "$", value);
    },
    removeMeta(key: string) {
      return this.removeItem(key + "$");
    },
    // Keys
    async getKeys(base) {
      base = normalizeBaseKey(base);
      const mounts = getMounts(base, true);
      let maskedMounts = [];
      const allKeys = [];
      for (const mount of mounts) {
        const rawKeys = await asyncCall(
          mount.driver.getKeys,
          mount.relativeBase
        );
        const keys = rawKeys
          .map((key) => mount.mountpoint + normalizeKey(key))
          .filter((key) => !maskedMounts.some((p) => key.startsWith(p)));
        allKeys.push(...keys);

        // When /mnt/foo is processed, any key in /mnt with /mnt/foo prefix should be masked
        // Using filter to improve performance. /mnt mask already covers /mnt/foo
        maskedMounts = [
          mount.mountpoint,
          ...maskedMounts.filter((p) => !p.startsWith(mount.mountpoint)),
        ];
      }
      return base
        ? allKeys.filter((key) => key.startsWith(base!) && !key.endsWith("$"))
        : allKeys.filter((key) => !key.endsWith("$"));
    },
    // Utils
    async clear(base) {
      base = normalizeBaseKey(base);
      await Promise.all(
        getMounts(base, false).map(async (m) => {
          if (m.driver.clear) {
            return asyncCall(m.driver.clear);
          }
          // Fallback to remove all keys if clear not implemented
          if (m.driver.removeItem) {
            const keys = await m.driver.getKeys();
            return Promise.all(keys.map((key) => m.driver.removeItem!(key)));
          }
          // Readonly
        })
      );
    },
    async dispose() {
      await Promise.all(
        Object.values(context.mounts).map((driver) => dispose(driver))
      );
    },
    async watch(callback) {
      await startWatch();
      context.watchListeners.push(callback);
      return async () => {
        context.watchListeners = context.watchListeners.filter(
          (listener) => listener !== callback
        );
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
          .catch(console.error); // eslint-disable-line no-console
      }
      return storage;
    },
    async unmount(base: string, _dispose = true) {
      base = normalizeBaseKey(base);
      if (!base /* root */ || !context.mounts[base]) {
        return;
      }
      if (context.watching && base in context.unwatch) {
        context.unwatch[base]();
        delete context.unwatch[base];
      }
      if (_dispose) {
        await dispose(context.mounts[base]);
      }
      context.mountpoints = context.mountpoints.filter((key) => key !== base);
      delete context.mounts[base];
    },
  };

  return storage;
}

export type Snapshot<T = string> = Record<string, T>;

export async function snapshot(
  storage: Storage,
  base: string
): Promise<Snapshot<string>> {
  base = normalizeBaseKey(base);
  const keys = await storage.getKeys(base);
  const snapshot: any = {};
  await Promise.all(
    keys.map(async (key) => {
      snapshot[key.slice(base.length)] = await storage.getItem(key);
    })
  );
  return snapshot;
}

export async function restoreSnapshot(
  driver: Storage,
  snapshot: Snapshot<StorageValue>,
  base = ""
) {
  base = normalizeBaseKey(base);
  await Promise.all(
    Object.entries(snapshot).map((e) => driver.setItem(base + e[0], e[1]))
  );
}

function watch(driver: Driver, onChange: WatchCallback, base: string) {
  return driver.watch
    ? driver.watch((event, key) => onChange(event, base + key))
    : () => {};
}

async function dispose(driver: Driver) {
  if (typeof driver.dispose === "function") {
    await asyncCall(driver.dispose);
  }
}
