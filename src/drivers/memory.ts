import { type DriverFactory } from "./utils/index.ts";
import { checkCAS } from "./utils/cas.ts";

const DRIVER_NAME = "memory";

const driver: DriverFactory<void, Map<string, any>> = () => {
  const data = new Map<string, any>();
  const etags = new Map<string, string>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  let counter = 0;
  const nextEtag = () => String(++counter);

  return {
    name: DRIVER_NAME,
    flags: { cas: true },
    getInstance: () => data,
    hasItem(key) {
      return data.has(key);
    },
    getItem(key) {
      return data.get(key) ?? null;
    },
    getItemRaw(key) {
      return data.get(key) ?? null;
    },
    getMeta(key) {
      return data.has(key) ? { etag: etags.get(key) } : null;
    },
    setItem(key, value, opts) {
      const wantsCAS = opts?.ifMatch !== undefined || opts?.ifNoneMatch !== undefined;
      if (wantsCAS) {
        checkCAS(DRIVER_NAME, key, { exists: data.has(key), etag: etags.get(key) }, opts);
      }
      _clearTimer(timers, key);
      data.set(key, value);
      const etag = nextEtag();
      etags.set(key, etag);
      _scheduleExpiry(data, etags, timers, key, opts?.ttl);
      return wantsCAS ? { etag } : undefined;
    },
    setItemRaw(key, value, opts) {
      const wantsCAS = opts?.ifMatch !== undefined || opts?.ifNoneMatch !== undefined;
      if (wantsCAS) {
        checkCAS(DRIVER_NAME, key, { exists: data.has(key), etag: etags.get(key) }, opts);
      }
      _clearTimer(timers, key);
      data.set(key, value);
      const etag = nextEtag();
      etags.set(key, etag);
      _scheduleExpiry(data, etags, timers, key, opts?.ttl);
      return wantsCAS ? { etag } : undefined;
    },
    removeItem(key) {
      _clearTimer(timers, key);
      data.delete(key);
      etags.delete(key);
    },
    getKeys() {
      return [...data.keys()];
    },
    clear() {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
      data.clear();
      etags.clear();
    },
    dispose() {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
      data.clear();
      etags.clear();
    },
  };
};

export default driver;

// --- Internal helpers ---

function _clearTimer(timers: Map<string, ReturnType<typeof setTimeout>>, key: string) {
  const existing = timers.get(key);
  if (existing !== undefined) {
    clearTimeout(existing);
    timers.delete(key);
  }
}

function _scheduleExpiry(
  data: Map<string, any>,
  etags: Map<string, string>,
  timers: Map<string, ReturnType<typeof setTimeout>>,
  key: string,
  ttl?: number,
) {
  if (!ttl) {
    return;
  }
  const ttlMs = ttl * 1000;
  const timer = setTimeout(() => {
    data.delete(key);
    etags.delete(key);
    timers.delete(key);
  }, ttlMs);
  if (timer && typeof timer === "object" && "unref" in timer) {
    timer.unref();
  }
  timers.set(key, timer);
}
