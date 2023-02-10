import { defineDriver } from "./utils";
import {
  BlobServiceClient,
  ContainerClient,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";

export interface AzureStorageBlobOptions {
  /**
   * The name of the Azure Storage account.
   * @default null
   */
  accountName?: string;
  /**
   * The name of the storage container. All entities will be stored in the same container.
   * @default 'unstorage'
   */
  containerName?: string;
  /**
   * The account key. If provided, the SAS key will be ignored. Only available in Node.js runtime.
   * @default null
   */
  accountKey?: string;
  /**
   * The SAS key. If provided, the account key will be ignored.
   * @default null
   */
  sasKey?: string;
  /**
   * The connection string. If provided, the account key and SAS key will be ignored. Only available in Node.js runtime.
   * @default null
   */
  connectionString?: string;
}

export default defineDriver((opts: AzureStorageBlobOptions = {}) => {
  const {
    accountName = null,
    containerName = "unstorage",
    accountKey = null,
    sasKey = null,
    connectionString = null,
  } = opts;
  if (!accountName)
    throw new Error(
      "Account name is required to use the Azure Storage Blob driver."
    );

  let containerClient: ContainerClient;
  const getContainerClient = () => {
    if (!containerClient) {
      let serviceClient: BlobServiceClient;
      if (accountKey) {
        // StorageSharedKeyCredential is only available in Node.js runtime, not in browsers
        const credential = new StorageSharedKeyCredential(
          accountName,
          accountKey
        );
        serviceClient = new BlobServiceClient(
          `https://${accountName}.blob.core.windows.net`,
          credential
        );
      } else if (sasKey) {
        serviceClient = new BlobServiceClient(
          `https://${accountName}.blob.core.windows.net${sasKey}`
        );
      } else if (connectionString) {
        // fromConnectionString is only available in Node.js runtime, not in browsers
        serviceClient =
          BlobServiceClient.fromConnectionString(connectionString);
      } else {
        const credential = new DefaultAzureCredential();
        serviceClient = new BlobServiceClient(
          `https://${accountName}.blob.core.windows.net`,
          credential
        );
      }
      containerClient = serviceClient.getContainerClient(containerName);
    }
    return containerClient;
  };

  return {
    async hasItem(key) {
      return await getContainerClient().getBlockBlobClient(key).exists();
    },
    async getItem(key) {
      try {
        const blob = await getContainerClient()
          .getBlockBlobClient(key)
          .download();
        if (isBrowser) {
          return await blobToString(await blob.blobBody);
        }
        return (await streamToBuffer(blob.readableStreamBody)).toString();
      } catch {
        return null;
      }
    },
    async setItem(key, value) {
      await getContainerClient()
        .getBlockBlobClient(key)
        .upload(value, Buffer.byteLength(value));
      return;
    },
    async removeItem(key) {
      await getContainerClient().getBlockBlobClient(key).delete();
      return;
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
      return;
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
    readableStream.on("data", (data: Buffer | string) => {
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
      resolve(ev.target.result);
    };
    fileReader.onerror = reject;
    fileReader.readAsText(blob);
  });
}
