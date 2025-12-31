import { describe } from "vitest";
import appwriteStorageDriver from "../../src/drivers/appwrite-storage.ts";
import { testDriver } from "./utils.ts";
import basex from "base-x";

const endpoint = process.env.VITE_APPWRITE_ENDPOINT;
const projectId = process.env.VITE_APPWRITE_PROJECT_ID;
const bucketId = process.env.VITE_APPWRITE_BUCKET_ID;
const apiKey = process.env.VITE_APPWRITE_API_KEY;

describe.skipIf(!endpoint || !projectId || !bucketId)(
  "drivers: appwrite-storage",
  () => {
    describe("keyStrategy: fileId", () => {
      const base62 = basex(
        "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
      );
      const textEncoder = new TextEncoder();
      const textDecoder = new TextDecoder();
      const FILE_ID_SEPARATOR = "_" as const;

      testDriver({
        driver: () =>
          appwriteStorageDriver({
            keyStrategy: "id",
            endpoint: endpoint!,
            projectId: projectId!,
            bucketId: bucketId!,
            apiKey: apiKey,
            encodeKey(key, keySeparator) {
              return key
                .split(keySeparator)
                .map((part) => {
                  return base62.encode(textEncoder.encode(part));
                })
                .join(FILE_ID_SEPARATOR);
            },
            decodeKey(fileId, keySeparator) {
              return fileId
                .split(FILE_ID_SEPARATOR)
                .map((part) => {
                  return textDecoder.decode(base62.decode(part));
                })
                .join(keySeparator);
            },
          }),
      });
    });

    describe("keyStrategy: name", () => {
      testDriver({
        driver: () =>
          appwriteStorageDriver({
            keyStrategy: "name",
            endpoint: endpoint!,
            projectId: projectId!,
            bucketId: bucketId!,
            apiKey: apiKey,
          }),
      });
    });
  }
);
