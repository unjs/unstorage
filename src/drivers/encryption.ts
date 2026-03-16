import type { Driver } from "unstorage";
import { createStorage } from "../storage.ts";
import { encryptedStorage } from "../utils.ts";
import { createRequiredError, type DriverFactory } from "./utils/index.ts";

export interface EncryptedStorageOptions {
  driver: Driver;
  encryptionKey: string;
  keyEncryption?: boolean;
}

const DRIVER_NAME = "encryption";

const driver: DriverFactory<EncryptedStorageOptions> = (opts) => {
  if (!opts.encryptionKey) {
    throw createRequiredError(DRIVER_NAME, "encryptionKey");
  }

  return {
    name: DRIVER_NAME,
    options: opts,
    ...encryptedStorage(
      createStorage({ driver: opts.driver }),
      opts.encryptionKey,
      opts.keyEncryption,
    ),
  };
};

export default driver;
