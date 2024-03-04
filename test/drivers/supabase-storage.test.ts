import { describe, vi } from "vitest";
import driver from "../../src/drivers/supabase-storage";
import { testDriver } from "./utils";
import { createStorage } from "../../src";
// The @supabase/storage-js package is included solely for the purpose of importing types.
import { FileObject, StorageClient, StorageError } from "@supabase/storage-js";
import { joinKeys, normalizeKey } from "../../src/drivers/utils";

type StorageFileApi = ReturnType<StorageClient["from"]>;

const mockStorage = createStorage();

const mockFileObject = (isFile: boolean, name: string): FileObject => ({
  name: name,
  id: isFile ? Math.random().toString() : "",
  bucket_id: "",
  owner: "",
  updated_at: "",
  created_at: "",
  last_accessed_at: "",
  metadata: {},
  buckets: {
    id: "",
    name: "",
    owner: "",
    created_at: "",
    updated_at: "",
    public: false,
  },
});

vi.mock("@supabase/supabase-js", () => {
  const list: StorageFileApi["list"] = async (path, options) => {
    try {
      const allKeys = await mockStorage.getKeys();

      // Find the exact file or folder
      if (options?.search) {
        const key = joinKeys(path || "", options.search || "");
        const data = allKeys.includes(key)
          ? [mockFileObject(true, key)]
          : allKeys.some((k) => k.startsWith(key))
            ? [mockFileObject(false, key)]
            : [];
        return {
          data,
          error: null,
        };
      }

      // List all files and folders under the path
      const key = normalizeKey(path || "");
      const keys = allKeys
        .filter((k) => k.startsWith(key))
        .map((k) => normalizeKey(k.replace(key, "")));
      return {
        data: keys.map((key) => {
          const isFile = /^[^:]+$/.test(key);
          const segments = key.split(":");
          return mockFileObject(isFile, segments[0]);
        }),
        error: null,
      };
    } catch (error) {
      throw error;
    }
  };

  const upload: StorageFileApi["upload"] = async (path, fileBody) => {
    try {
      await mockStorage.setItemRaw(path, fileBody);
      return {
        data: { path },
        error: null,
      };
    } catch (error) {
      throw error;
    }
  };

  const remove: StorageFileApi["remove"] = async (paths) => {
    try {
      await Promise.all(paths.map((p) => mockStorage.removeItem(p)));
      return {
        data: paths.map((path) =>
          mockFileObject(true, path.split("/").at(-1) || "")
        ),
        error: null,
      };
    } catch (error) {
      throw error;
    }
  };

  const download: StorageFileApi["download"] = async (path) => {
    try {
      const file = await mockStorage.getItemRaw(path);
      return file
        ? {
            data: new Blob([file]),
            error: null,
          }
        : {
            data: null,
            error: new StorageError(""),
          };
    } catch (error) {
      throw error;
    }
  };

  return {
    createClient: () => ({
      storage: {
        from: () => ({
          list,
          upload,
          remove,
          download,
        }),
      },
    }),
  };
});

describe("drivers: supabase-storage", async () => {
  testDriver({
    driver: driver({
      url: "<your Supabase project URL>",
      key: "<your Supabase project API key>",
      bucket: "<your Supabase project storage bucket name>",
    }),
  });

  testDriver({
    driver: driver({
      base: "output",
      url: "<your Supabase project URL>",
      key: "<your Supabase project API key>",
      bucket: "<your Supabase project storage bucket name>",
    }),
  });
});
