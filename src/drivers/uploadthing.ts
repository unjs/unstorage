import { defineDriver } from "./utils";
import { ofetch, $Fetch } from "ofetch";
import { UTApi } from "uploadthing/server";

export interface UploadThingOptions {
  apiKey: string;
}

export default defineDriver<UploadThingOptions>((opts) => {
  let client: UTApi;
  let utApiFetch: $Fetch;

  const getClient = () => {
    return (client ??= new UTApi({
      apiKey: opts.apiKey,
      fetch: ofetch.native,
    }));
  };

  // The UTApi doesn't have all methods we need right now, so use raw fetch
  const getUTApiFetch = () => {
    return (utApiFetch ??= ofetch.create({
      method: "POST",
      baseURL: "https://uploadthing.com/api",
      headers: {
        "x-uploadthing-api-key": opts.apiKey,
      },
    }));
  };

  function getKeys() {
    return getClient()
      .listFiles({})
      .then((res) =>
        res.map((file) => file.customId).filter((k): k is string => !!k)
      );
  }

  return {
    hasItem(id) {
      return getClient()
        .getFileUrls(id, { keyType: "customId" })
        .then((res) => {
          return !!res.length;
        });
    },
    async getItem(id) {
      const url = await getClient()
        .getFileUrls(id, { keyType: "customId" })
        .then((res) => {
          return res[0]?.url;
        });
      if (!url) return null;
      return ofetch(url).then((res) => res.text());
    },
    getKeys() {
      return getKeys();
    },
    setItem(key, value, opts) {
      return getClient()
        .uploadFiles(
          Object.assign(new Blob([value]), {
            name: key,
            customId: key,
          }),
          { metadata: opts?.metadata }
        )
        .then(() => {});
    },
    setItems(items, opts) {
      return getClient()
        .uploadFiles(
          items.map((item) =>
            Object.assign(new Blob([item.value]), {
              name: item.key,
              customId: item.key,
            })
          ),
          { metadata: opts?.metadata }
        )
        .then(() => {});
    },
    removeItem(key, opts) {
      return getClient()
        .deleteFiles([key], { keyType: "customId" })
        .then(() => {});
    },
    async clear() {
      const keys = await getKeys();
      return getClient()
        .deleteFiles(keys, { keyType: "customId" })
        .then(() => {});
    },

    // getMeta(key, opts) {
    //   // TODO: We don't currently have an endpoint to fetch metadata, but it does exist
    // },
  };
});
