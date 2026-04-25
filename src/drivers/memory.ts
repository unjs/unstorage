import { type DriverFactory } from "./utils/index.ts";

const DRIVER_NAME = "memory";

const driver: DriverFactory<void, Map<string, any>> = () => {
  const data = new Map<string, any>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  return {
    name: DRIVER_NAME,
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
    setItem(key, value, opts) {
      _clearTimer(timers, key);
      data.set(key, value);
      _scheduleExpiry(data, timers, key, opts?.ttl);
    },
    setItemRaw(key, value, opts) {
      _clearTimer(timers, key);
      data.set(key, value);
      _scheduleExpiry(data, timers, key, opts?.ttl);
    },
    removeItem(key) {
      _clearTimer(timers, key);
      data.delete(key);
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
    },
    dispose() {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
      data.clear();
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
    timers.delete(key);
  }, ttlMs);
  if (timer && typeof timer === "object" && "unref" in timer) {
    timer.unref();
  }
  timers.set(key, timer);
}
