import { type DriverFactory, normalizeKey } from "./utils/index.ts";
import { UTApi } from "uploadthing/server";

// Reference: https://docs.uploadthing.com

type UTApiOptions = Omit<
  Exclude<ConstructorParameters<typeof UTApi>[0], undefined>,
  "defaultKeyType"
>;

type FileEsque = Parameters<UTApi["uploadFiles"]>[0][0];

export interface UploadThingOptions extends UTApiOptions {
  /** base key to add to keys */
  base?: string;
}

const DRIVER_NAME = "uploadthing";

const driver: DriverFactory<UploadThingOptions, UTApi> = (opts = {}) => {
  let client: UTApi;

  const base = opts.base ? normalizeKey(opts.base) : "";
  const r = (key: string) => (base ? `${base}:${key}` : key);

  const getClient = () => {
    return (client ??= new UTApi({
      ...opts,
      defaultKeyType: "customId",
    }));
  };

  const getKeys = async (base: string) => {
    const client = getClient();
    const { files } = await client.listFiles({});
    return files.map((file) => file.customId).filter((k) => k && k.startsWith(base)) as string[];
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
    getKeys(base) {
      return getKeys(r(base));
    },
    async hasItem(key) {
      const client = getClient();
      const res = await client.getFileUrls(r(key));
      return res.data.length > 0;
    },
    async getItem(key) {
      const client = getClient();
      const url = await client.getFileUrls(r(key)).then((res) => res.data[0]?.url);
      if (!url) return null;
      return fetch(url).then((res) => res.text());
    },
    async getItemRaw(key) {
      const client = getClient();
      const url = await client.getFileUrls(r(key)).then((res) => res.data[0]?.url);
      if (!url) return null;
      return fetch(url).then((res) => res.arrayBuffer());
    },
    async setItem(key, value) {
      const client = getClient();
      await client.uploadFiles(toFile(r(key), value));
    },
    async setItemRaw(key, value) {
      const client = getClient();
      await client.uploadFiles(toFile(r(key), value));
    },
    async setItems(items) {
      const client = getClient();
      await client.uploadFiles(items.map((item) => toFile(r(item.key), item.value)));
    },
    async removeItem(key) {
      const client = getClient();
      await client.deleteFiles([r(key)]);
    },
    async clear(base) {
      const client = getClient();
      const keys = await getKeys(r(base));
      await client.deleteFiles(keys);
    },
    // getMeta(key, opts) {
    //   // TODO: We don't currently have an endpoint to fetch metadata, but it does exist
    // },
  };
};

export default driver;
