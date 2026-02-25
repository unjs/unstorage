import { createError, defineDriver } from "./utils/index.ts";
import {
  BlobServiceClient,
  ContainerClient,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";

export interface AzureStorageBlobOptions {
  /**
   * The name of the Azure Storage account.
   */
  accountName?: string;

  /**
   * The name of the storage container. All entities will be stored in the same container. Will be created if it doesn't exist.
   * @default "unstorage"
   */
  containerName?: string;

  /**
   * The account key. If provided, the SAS key will be ignored. Only available in Node.js runtime.
   */
  accountKey?: string;

  /**
   * The SAS token. If provided, the account key will be ignored. Include at least read, list and write permissions to be able to list keys.
   */
  sasKey?: string;

  /**
   * The SAS URL. If provided, the account key, SAS key and container name will be ignored.
   */
  sasUrl?: string;

  /**
   * The connection string. If provided, the account key and SAS key will be ignored. Only available in Node.js runtime.
   */
  connectionString?: string;

  /**
   * Storage account endpoint suffix. Need to be changed for Microsoft Azure operated by 21Vianet, Azure Government or Azurite.
   * @default ".blob.core.windows.net"
   */
  endpointSuffix?: string;
}

const DRIVER_NAME = "azure-storage-blob";

export default defineDriver((opts: AzureStorageBlobOptions) => {
  let containerClient: ContainerClient;
  const endpointSuffix = opts.endpointSuffix || ".blob.core.windows.net";
  const getContainerClient = () => {
    if (containerClient) {
      return containerClient;
    }
    if (!opts.connectionString && !opts.sasUrl && !opts.accountName) {
      throw createError(DRIVER_NAME, "missing accountName");
    }
    let serviceClient: BlobServiceClient;
    if (opts.accountKey) {
      // StorageSharedKeyCredential is only available in Node.js runtime, not in browsers
      const credential = new StorageSharedKeyCredential(
        opts.accountName!,
        opts.accountKey
      );
      serviceClient = new BlobServiceClient(
        `https://${opts.accountName}${endpointSuffix}`,
        credential
      );
    } else if (opts.sasUrl) {
      if (
        opts.containerName &&
        opts.sasUrl.includes(`${opts.containerName}?`)
      ) {
        // Check if the sas url is a container url
        containerClient = new ContainerClient(`${opts.sasUrl}`);
        return containerClient;
      }
      serviceClient = new BlobServiceClient(opts.sasUrl);
    } else if (opts.sasKey) {
      if (opts.containerName) {
        containerClient = new ContainerClient(
          `https://${opts.accountName}${endpointSuffix}/${opts.containerName}?${opts.sasKey}`
        );
        return containerClient;
      }
      serviceClient = new BlobServiceClient(
        `https://${opts.accountName}${endpointSuffix}?${opts.sasKey}`
      );
    } else if (opts.connectionString) {
      // fromConnectionString is only available in Node.js runtime, not in browsers
      serviceClient = BlobServiceClient.fromConnectionString(
        opts.connectionString
      );
    } else {
      const credential = new DefaultAzureCredential();
      serviceClient = new BlobServiceClient(
        `https://${opts.accountName}${endpointSuffix}`,
        credential
      );
    }
    containerClient = serviceClient.getContainerClient(
      opts.containerName || "unstorage"
    );
    containerClient.createIfNotExists();
    return containerClient;
  };

  return {
    name: DRIVER_NAME,
    options: opts,
    getInstance: getContainerClient,
    async hasItem(key) {
      return await getContainerClient().getBlockBlobClient(key).exists();
    },
    async getItem(key) {
      try {
        const blob = await getContainerClient()
          .getBlockBlobClient(key)
          .download();
        if (isBrowser) {
          return blob.blobBody ? await blobToString(await blob.blobBody) : null;
        }
        return blob.readableStreamBody
          ? (await streamToBuffer(blob.readableStreamBody)).toString()
          : null;
      } catch {
        return null;
      }
    },
    async getItemRaw(key) {
      try {
        const blob = await getContainerClient()
          .getBlockBlobClient(key)
          .download();
        if (isBrowser) {
          return blob.blobBody ? await blobToString(await blob.blobBody) : null;
        }
        return blob.readableStreamBody
          ? await streamToBuffer(blob.readableStreamBody)
          : null;
      } catch {
        return null;
      }
    },
    async setItem(key, value) {
      await getContainerClient()
        .getBlockBlobClient(key)
        .upload(value, Buffer.byteLength(value));
    },
    async setItemRaw(key, value) {
      await getContainerClient()
        .getBlockBlobClient(key)
        .upload(value, Buffer.byteLength(value));
    },
    async removeItem(key) {
      await getContainerClient()
        .getBlockBlobClient(key)
        .deleteIfExists({ deleteSnapshots: "include" });
    },
    async getKeys() {
      const iterator = getContainerClient()
        .listBlobsFlat()
        .byPage({ maxPageSize: 1000 });
      const keys: string[] = [];
      for await (const page of iterator) {
        const pageKeys = page.segment.blobItems.map((blob) => blob.name);
        keys.push(...pageKeys);
      }
      return keys;
    },
    async getMeta(key) {
      const blobProperties = await getContainerClient()
        .getBlockBlobClient(key)
        .getProperties();
      return {
        mtime: blobProperties.lastModified,
        atime: blobProperties.lastAccessed,
        cr: blobProperties.createdOn,
        ...blobProperties.metadata,
      };
    },
    async clear() {
      const iterator = getContainerClient()
        .listBlobsFlat()
        .byPage({ maxPageSize: 1000 });
      for await (const page of iterator) {
        await Promise.all(
          page.segment.blobItems.map(
            async (blob) =>
              await getContainerClient().deleteBlob(blob.name, {
                deleteSnapshots: "include",
              })
          )
        );
      }
    },
  };
});

const isBrowser = typeof window !== "undefined";

// Helper function to read a Node.js readable stream into a Buffer. (https://github.com/Azure/azure-sdk-for-js/tree/main/sdk/storage/storage-blob)
async function streamToBuffer(
  readableStream: NodeJS.ReadableStream
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    readableStream.on("data", (data) => {
      chunks.push(data instanceof Buffer ? data : Buffer.from(data));
    });
    readableStream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    readableStream.on("error", reject);
  });
}

// Helper function used to convert a browser Blob into string. (https://github.com/Azure/azure-sdk-for-js/tree/main/sdk/storage/storage-blob)
async function blobToString(blob: Blob) {
  const fileReader = new FileReader();
  return new Promise((resolve, reject) => {
    fileReader.onloadend = (ev) => {
      resolve(ev.target?.result);
    };
    // eslint-disable-next-line unicorn/prefer-add-event-listener
    fileReader.onerror = reject;
    // eslint-disable-next-line unicorn/prefer-blob-reading-methods
    fileReader.readAsText(blob);
  });
}
