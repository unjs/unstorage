import { type DriverFactory } from "./utils/index.ts";

const DRIVER_NAME = "null";

const driver: DriverFactory<void> = () => {
  return {
    name: DRIVER_NAME,
    hasItem() {
      return false;
    },
    getItem() {
      return null;
    },
    getItemRaw() {
      return null;
    },
    getItems() {
      return [];
    },
    getMeta() {
      return null;
    },
    getKeys() {
      return [];
    },
    setItem() {},
    setItemRaw() {},
    setItems() {},
    removeItem() {},
    clear() {},
  };
};

export default driver;
