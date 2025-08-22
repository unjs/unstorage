import { defineDriver } from "./utils";
import localstorage, { type LocalStorageOptions } from "./localstorage";

export interface SessionStorageOptions extends LocalStorageOptions {}

const DRIVER_NAME = "session-storage";

export default defineDriver((opts: SessionStorageOptions = {}) => {
  return {
    ...localstorage({
      windowKey: "sessionStorage",
      ...opts,
    }),
    name: DRIVER_NAME,
  };
});
