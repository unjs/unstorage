import { defineDriver } from "./utils";
import { ofetch, $Fetch } from "ofetch";
import { UTApi } from "uploadthing/server";

export interface UploadThingOptions {
  apiKey: string;
}

export default defineDriver<UploadThingOptions>((opts) => {
  let client: UTApi;
  let utApiFetch: $Fetch;
  let utFsFetch: $Fetch;

  const internalToUTKeyMap = new Map<string, string>();
  const fromUTKey = (utKey: string) => {
    for (const [key, value] of internalToUTKeyMap.entries()) {
      if (value === utKey) {
        return key;
      }
    }
  };

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

  const getUTFsFetch = () => {
    return (utFsFetch ??= ofetch.create({
      baseURL: "https://utfs.io/f",
    }));
  };

  return {
    hasItem(key) {
      const utkey = internalToUTKeyMap.get(key);
      if (!utkey) return false;
      // This is the best endpoint we got currently...
      return getUTApiFetch()("/getFileUrl", {
        body: { fileKeys: [utkey] },
      }).then((res) => {
        return !!res?.data?.length;
      });
    },
    getItem(key) {
      const utkey = internalToUTKeyMap.get(key);
      if (!utkey) return null;
      return getUTFsFetch()(`/${utkey}`).then((r) => r.text());
    },
    getKeys() {
      return getClient()
        .listFiles({})
        .then((res) =>
          res.map((file) => fromUTKey(file.key)).filter((k): k is string => !!k)
        );
    },
    setItem(key, value, opts) {
      return getClient()
        .uploadFiles(Object.assign(new Blob([value]), { name: key }), {
          metadata: opts?.metadata,
        })
        .then((response) => {
          if (response.error) throw response.error;
          internalToUTKeyMap.set(key, response.data.key);
        });
    },
    setItems(items, opts) {
      return getClient()
        .uploadFiles(
          items.map((item) =>
            Object.assign(new Blob([item.value]), { name: item.key })
          ),
          { metadata: opts?.metadata }
        )
        .then((responses) => {
          responses.map((response) => {
            if (response.error) throw response.error;
            internalToUTKeyMap.set(response.data.name, response.data.key);
          });
        });
    },
    removeItem(key, opts) {
      const utkey = internalToUTKeyMap.get(key);
      if (!utkey) throw new Error(`Unknown key: ${key}`);
      return getClient()
        .deleteFiles([utkey])
        .then(() => {
          internalToUTKeyMap.delete(key);
        });
    },
    async clear() {
      const utkeys = Array.from(internalToUTKeyMap.values());
      return getClient()
        .deleteFiles(utkeys)
        .then(() => {
          internalToUTKeyMap.clear();
        });
    },

    // getMeta(key, opts) {
    //   // TODO: We don't currently have an endpoint to fetch metadata, but it does exist
    // },
  };
});
