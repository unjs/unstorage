import { createRequiredError, defineDriver } from "./utils";
import type { Driver } from "../types";
import { encryptedStorage } from "../utils";
import { createStorage } from "../storage";

export interface EncryptedStorageOptions {
  /**
   * Driver to wrap for encrypted storage.
   * @required
   */
  driver: Driver;
  /**
   * Encryption key to use. Must be base64 encoded 32 bytes (256 bit) long key.
   * @required
   */
  encryptionKey: string;
  /**
   * Whether to encrypt keys as well. Defaults to false.
   * @default false
   */
  keyEncryption?: boolean;
}

const DRIVER_NAME = "encryption";

export default defineDriver((opts: EncryptedStorageOptions) => {
  if (!opts.encryptionKey) {
    throw createRequiredError(DRIVER_NAME, "encryptionKey");
  }
  return {
    name: DRIVER_NAME,
    options: opts,
    ...encryptedStorage(
      createStorage({ driver: opts.driver }),
      opts.encryptionKey,
      opts.keyEncryption
    ),
  };
});
