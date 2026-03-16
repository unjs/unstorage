import { type DriverFactory } from "./utils/index.ts";
import localstorage, { type LocalStorageOptions } from "./localstorage.ts";

export interface SessionStorageOptions extends LocalStorageOptions {}

const DRIVER_NAME = "session-storage";

const driver: DriverFactory<SessionStorageOptions, Storage> = (opts = {}) => {
  return {
    ...localstorage({
      windowKey: "sessionStorage",
      ...opts,
    }),
    name: DRIVER_NAME,
  };
};

export default driver;
