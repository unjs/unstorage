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
    [Symbol.asyncDispose]() {
      return this.dispose();
    },
  };
};

export default driver;

// --- Internal helpers ---

const MAX_TIMER_DELAY = 2 ** 31 - 1;

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
  if (!ttl || !Number.isFinite(ttl)) {
    return;
  }
  // Delays above MAX_TIMER_DELAY overflow to 1ms, so long TTLs are split into chunks
  let remaining = ttl * 1000;
  const schedule = () => {
    const delay = Math.min(remaining, MAX_TIMER_DELAY);
    remaining -= delay;
    const timer = setTimeout(() => {
      if (remaining > 0) {
        schedule();
        return;
      }
      data.delete(key);
      timers.delete(key);
    }, delay);
    if (timer && typeof timer === "object" && "unref" in timer) {
      timer.unref();
    }
    timers.set(key, timer);
  };
  schedule();
}
