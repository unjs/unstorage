import { defineDriver } from "./utils";
import localstorage, { type LocalStorageOptions } from "./localstorage";

export interface SessionStorageOptions extends LocalStorageOptions {}

const DRIVER_NAME = "session-storage";

export default defineDriver((opts: SessionStorageOptions = {}) => {
  return {
    name: DRIVER_NAME,
    ...localstorage({
      windowKey: "sessionStorage",
      ...opts,
    }),
  };
});
