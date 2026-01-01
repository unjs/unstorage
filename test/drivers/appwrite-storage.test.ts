import { describe } from "vitest";
import appwriteStorageDriver from "../../src/drivers/appwrite-storage.ts";
import { testDriver } from "./utils.ts";
import { keyOptions } from "./appwrite.fixture.ts";

const endpoint = process.env.VITE_APPWRITE_ENDPOINT;
const projectId = process.env.VITE_APPWRITE_PROJECT_ID;
const bucketId = process.env.VITE_APPWRITE_BUCKET_ID;
const apiKey = process.env.VITE_APPWRITE_API_KEY;

describe.skipIf(!endpoint || !projectId || !bucketId)(
  "drivers: appwrite-storage",
  () => {
    const projectOptions = {
      endpoint: endpoint!,
      projectId: projectId!,
      bucketId: bucketId!,
      apiKey,
    };

    describe("keyStrategy: fileId", () => {
      testDriver({
        driver: () =>
          appwriteStorageDriver({
            keyStrategy: "id",
            ...projectOptions,
            ...keyOptions,
          }),
      });
    });

    describe("keyStrategy: name", () => {
      testDriver({
        driver: () =>
          appwriteStorageDriver({
            keyStrategy: "name",
            ...projectOptions,
            apiKey,
          }),
      });
    });
  }
);
