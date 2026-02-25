import { createStorage } from "unstorage";
import webExtensionStorageDriver from "unstorage/drivers/web-extension-storage";

export const storage = createStorage({
  driver: webExtensionStorageDriver({ storageArea: "local" }),
});
