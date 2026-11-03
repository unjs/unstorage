import { type DriverFactory, importLib, type LibImport, normalizeKey, type DriverDependencies, listPrefix, matchesPrefix, stripBase } from "./utils/index.ts";
import type { UTApi } from "uploadthing/server";

// Reference: https://docs.uploadthing.com

type UTApiOptions = Omit<
  Exclude<ConstructorParameters<typeof UTApi>[0], undefined>,
  "defaultKeyType"
>;

type FileEsque = Parameters<UTApi["uploadFiles"]>[0][0];

export interface UploadThingOptions extends UTApiOptions {
  /** base key to add to keys */
  base?: string;

  /**
   * Optionally provide the [`uploadthing/server`](https://www.npmjs.com/package/uploadthing) library
   * to avoid dynamically importing it.
   */
  lib?: LibImport<typeof import("uploadthing/server")>;
}

export const DRIVER_DEPENDENCIES: DriverDependencies = {
  lib: { name: "uploadthing", import: "uploadthing/server", version: "^7.7.4" },
};

const DRIVER_NAME = "uploadthing";

const driver: DriverFactory<UploadThingOptions, Promise<UTApi>> = (opts = {}) => {
  let client: Promise<UTApi> | undefined;

  const base = opts.base ? normalizeKey(opts.base) : "";
  const r = (key: string) => (base ? `${base}:${key}` : key);

  const getClient = () =>
    (client ??= (async () => {
      const { UTApi } = await importLib(DRIVER_NAME, "uploadthing/server", opts.lib);
      return new UTApi({
        ...opts,
        defaultKeyType: "customId",
      });
    })());

  // Raw, fully-prefixed custom ids: what deleteFiles wants, never what getKeys returns.
  const listKeys = async (relativeBase: string = "") => {
    const client = await getClient();
    const { files } = await client.listFiles({});
    const prefix = listPrefix(base, relativeBase);
    return ((files.map((file) => file.customId) as string[]) || []).filter(
      (k) => k && matchesPrefix(k, prefix),
    );
  };

  const toFile = (key: string, value: BlobPart) => {
    return Object.assign(new Blob([value]), {
      name: key,
      customId: key,
    }) satisfies FileEsque;
  };

  return {
    name: DRIVER_NAME,
    getInstance() {
      return getClient();
    },
    getKeys(relativeBase?: string) {
      return listKeys(relativeBase || "").then((keys) => keys.map((key) => stripBase(key, base)));
    },
    async hasItem(key) {
      const client = await getClient();
      const res = await client.getFileUrls(r(key));
      return res.data.length > 0;
    },
    async getItem(key) {
      const client = await getClient();
      const url = await client.getFileUrls(r(key)).then((res) => res.data[0]?.url);
      if (!url) return null;
      return fetch(url).then((res) => res.text());
    },
    async getItemRaw(key) {
      const client = await getClient();
      const url = await client.getFileUrls(r(key)).then((res) => res.data[0]?.url);
      if (!url) return null;
      return fetch(url).then((res) => res.arrayBuffer());
    },
    async setItem(key, value) {
      const client = await getClient();
      await client.uploadFiles(toFile(r(key), value));
    },
    async setItemRaw(key, value) {
      const client = await getClient();
      await client.uploadFiles(toFile(r(key), value));
    },
    async setItems(items) {
      const client = await getClient();
      await client.uploadFiles(items.map((item) => toFile(r(item.key), item.value)));
    },
    async removeItem(key) {
      const client = await getClient();
      await client.deleteFiles([r(key)]);
    },
    async clear(relativeBase?: string) {
      const client = await getClient();
      await client.deleteFiles(await listKeys(relativeBase || ""));
    },
    // getMeta(key, opts) {
    //   // TODO: We don't currently have an endpoint to fetch metadata, but it does exist
    // },
  };
};

export default driver;
