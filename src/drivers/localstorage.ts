import { createRequiredError, defineDriver } from "./utils";
import webStorage from "./web-storage";

export interface LocalStorageOptions {
  base?: string;
  window?: typeof window;
  localStorage?: typeof window.localStorage;
}

const DRIVER_NAME = "localstorage";

export default defineDriver((opts: LocalStorageOptions = {}) => {
  if (!opts.window) {
    opts.window = typeof window !== "undefined" ? window : undefined;
  }
  if (!opts.localStorage) {
    opts.localStorage = opts.window?.localStorage;
  }
  if (!opts.localStorage) {
    throw createRequiredError(DRIVER_NAME, "localStorage");
  }

  return webStorage({
    base: opts.base,
    window: opts.window,
    storageArea: opts.localStorage,
  })
});
