import { defineDriver } from "./utils";
import { ofetch, $Fetch } from "ofetch";
import { UTApi } from "uploadthing/server";

export interface UploadThingOptions {
  apiKey: string;
  /**
   * Primarily used for testing
   * @default "https://uploadthing.com/api"
   */
  uploadthignApiUrl?: string;
  /**
   * Primarily used for testing
   * @default "https://utfs.io/f"
   */
  uploadthingFileUrl?: string;
}

export default defineDriver<UploadThingOptions>((opts) => {
  let client: UTApi;
  let utFetch: $Fetch;

  const getClient = () => {
    return (client ??= new UTApi({
      apiKey: opts.apiKey,
      fetch: ofetch.native,
    }));
  };

  const getUTFetch = () => {
    return (utFetch ??= ofetch.create({
      baseURL: opts.uploadthignApiUrl ?? "https://uploadthing.com/api",
      headers: {
        "x-uploadthing-api-key": opts.apiKey,
      },
    }));
  };

  return {
    hasItem(key) {
      // This is the best endpoint we got currently...
      return getUTFetch()("/getFileUrl", {
        body: { fileKeys: [key] },
      }).then((res) => res.ok);
    },
    getItem(key) {
      return ofetch(`/${key}`, {
        baseURL: opts.uploadthingFileUrl ?? "https://utfs.io/f",
      });
    },
    getItemRaw(key) {
      return ofetch
        .native(`https://utfs.io/f/${key}`)
        .then((res) => res.arrayBuffer());
    },
    getKeys() {
      return getClient()
        .listFiles({})
        .then((res) => res.map((file) => file.key));
    },
    setItem(key, value, opts) {
      return getClient()
        .uploadFiles(new Blob([value]), {
          metadata: opts.metadata,
        })
        .then(() => {});
    },
    setItems(items, opts) {
      return getClient()
        .uploadFiles(
          items.map((item) => new Blob([item.value])),
          {
            metadata: opts?.metadata,
          }
        )
        .then(() => {});
    },
    removeItem(key, opts) {
      return getClient()
        .deleteFiles([key])
        .then(() => {});
    },
    async clear() {
      const client = getClient();
      const keys = await client.listFiles({}).then((r) => r.map((f) => f.key));
      return client.deleteFiles(keys).then(() => {});
    },
    // getMeta(key, opts) {
    //   // TODO: We don't currently have an endpoint to fetch metadata, but it does exist
    // },
  };
});
