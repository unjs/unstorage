import { createError, defineDriver } from "./utils";
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
  accountName: string;

  /**
   * The name of the storage container. All entities will be stored in the same container.
   * @default "unstorage"
   */
  containerName?: string;

  /**
   * The account key. If provided, the SAS key will be ignored. Only available in Node.js runtime.
   */
  accountKey?: string;

  /**
   * The SAS key. If provided, the account key will be ignored.
   */
  sasKey?: string;

  /**
   * The connection string. If provided, the account key and SAS key will be ignored. Only available in Node.js runtime.
   */
  connectionString?: string;
}

const DRIVER_NAME = "azure-storage-blob";

export default defineDriver((opts: AzureStorageBlobOptions) => {
  let containerClient: ContainerClient;
  const getContainerClient = () => {
    if (containerClient) {
      return containerClient;
    }
    if (!opts.accountName) {
      throw createError(DRIVER_NAME, "accountName");
    }
    let serviceClient: BlobServiceClient;
    if (opts.accountKey) {
      // StorageSharedKeyCredential is only available in Node.js runtime, not in browsers
      const credential = new StorageSharedKeyCredential(
        opts.accountName,
        opts.accountKey
      );
      serviceClient = new BlobServiceClient(
        `https://${opts.accountName}.blob.core.windows.net`,
        credential
      );
    } else if (opts.sasKey) {
      serviceClient = new BlobServiceClient(
        `https://${opts.accountName}.blob.core.windows.net${opts.sasKey}`
      );
    } else if (opts.connectionString) {
      // fromConnectionString is only available in Node.js runtime, not in browsers
      serviceClient = BlobServiceClient.fromConnectionString(
        opts.connectionString
      );
    } else {
      const credential = new DefaultAzureCredential();
      serviceClient = new BlobServiceClient(
        `https://${opts.accountName}.blob.core.windows.net`,
        credential
      );
    }
    containerClient = serviceClient.getContainerClient(
      opts.containerName || "unstorage"
    );
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
    async setItem(key, value) {
      await getContainerClient()
        .getBlockBlobClient(key)
        .upload(value, Buffer.byteLength(value));
    },
    async removeItem(key) {
      const exists = await getContainerClient()
        .getBlockBlobClient(key)
        .exists();
      if (exists) {
        await getContainerClient()
          .getBlockBlobClient(key)
          .delete({ deleteSnapshots: "include" });
      }
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
      resolve(ev.target?.result);
    };
    // eslint-disable-next-line unicorn/prefer-add-event-listener
    fileReader.onerror = reject;
    // eslint-disable-next-line unicorn/prefer-blob-reading-methods
    fileReader.readAsText(blob);
  });
}
