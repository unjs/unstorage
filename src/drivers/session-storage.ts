import { createRequiredError, defineDriver } from "./utils";
import webStorage from "./web-storage";

export interface SessionStorageOptions {
  base?: string;
  window?: typeof window;
  sessionStorage?: typeof window.sessionStorage;
}

const DRIVER_NAME = "session-storage";

export default defineDriver((opts: SessionStorageOptions = {}) => {
  if (!opts.window) {
    opts.window = typeof window !== "undefined" ? window : undefined;
  }
  if (!opts.sessionStorage) {
    opts.sessionStorage = opts.window?.sessionStorage;
  }
  if (!opts.sessionStorage) {
    throw createRequiredError(DRIVER_NAME, "sessionStorage");
  }

  return webStorage({
    base: opts.base,
    window: opts.window,
    storageArea: opts.sessionStorage,
  })
});
