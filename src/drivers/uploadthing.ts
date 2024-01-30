import { defineDriver } from "./utils";
import { ofetch, $Fetch } from "ofetch";
import { UTApi } from "uploadthing/server";

export interface UploadThingOptions {
  apiKey: string;
}

export default defineDriver<UploadThingOptions>((opts) => {
  let client: UTApi;
  const getClient = () => {
    return (client ??= new UTApi({
      apiKey: opts.apiKey,
      fetch: ofetch.native,
    }));
  };

  async function getKeys() {
    const res = await getClient().listFiles({});
    return res.map((file) => file.customId).filter((k): k is string => !!k);
  }

  return {
    hasItem: async (id) => {
      const res = await getClient().getFileUrls(id, { keyType: "customId" });
      return res.length > 0;
    },
    getItem: async (id) => {
      const url = await getClient()
        .getFileUrls(id, { keyType: "customId" })
        .then((res) => {
          return res[0]?.url;
        });
      if (!url) return null;
      return ofetch(url).then((res) => res.text());
    },
    getKeys: () => {
      return getKeys();
    },
    setItem: async (key, value, opts) => {
      await getClient().uploadFiles(
        Object.assign(new Blob([value]), {
          name: key,
          customId: key,
        }),
        { metadata: opts?.metadata }
      );
    },
    setItems: async (items, opts) => {
      await getClient().uploadFiles(
        items.map((item) =>
          Object.assign(new Blob([item.value]), {
            name: item.key,
            customId: item.key,
          })
        ),
        { metadata: opts?.metadata }
      );
    },
    removeItem: async (key, opts) => {
      await getClient().deleteFiles([key], { keyType: "customId" });
    },
    clear: async () => {
      const keys = await getKeys();
      await getClient().deleteFiles(keys, { keyType: "customId" });
    },

    // getMeta(key, opts) {
    //   // TODO: We don't currently have an endpoint to fetch metadata, but it does exist
    // },
  };
});
