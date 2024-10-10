import { defineDriver } from "./utils";

const DRIVER_NAME = "null";

export default defineDriver<void>(() => {
  return {
    name: DRIVER_NAME,
    hasItem(_key) {
      return false;
    },
    getItem(_key) {
      return null;
    },
    getKeys() {
      return [];
    },
  };
});
