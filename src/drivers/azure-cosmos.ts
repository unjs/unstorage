import {
  createRequiredError,
  type DriverFactory,
  importLib,
  type LibImport,
  type DriverDependencies,
} from "./utils/index.ts";
import { type AzureIdentityOptions, createDefaultAzureCredential } from "./utils/azure.ts";
import type { Container, CosmosClient as CosmosClientType } from "@azure/cosmos";

export interface AzureCosmosOptions extends AzureIdentityOptions {
  /**
   * CosmosDB endpoint in the format of https://<account>.documents.azure.com:443/.
   */
  endpoint: string;

  /**
   * CosmosDB account key. If not provided, the driver will use the DefaultAzureCredential (recommended).
   */
  accountKey?: string;

  /**
   * The name of the database to use. Defaults to `unstorage`.
   * @default "unstorage"
   */
  databaseName?: string;

  /**
   * The name of the container to use. Defaults to `unstorage`.
   * @default "unstorage"
   */
  containerName?: string;

  /**
   * Optionally provide the [`@azure/cosmos`](https://www.npmjs.com/package/@azure/cosmos) library
   * to avoid dynamically importing it.
   */
  lib?: LibImport<typeof import("@azure/cosmos")>;
}

export const DRIVER_DEPENDENCIES: DriverDependencies = {
  lib: { name: "@azure/cosmos", version: "^4.9.1" },
  identityLib: { name: "@azure/identity", version: "^4.13.0", optional: true },
};

const DRIVER_NAME = "azure-cosmos";

export interface AzureCosmosItem {
  /**
   * The unstorage key as id of the item.
   */
  id: string;

  /**
   * The unstorage value of the item.
   */
  value: string;

  /**
   * The unstorage mtime metadata of the item.
   */
  modified: string | Date;
}

const driver: DriverFactory<AzureCosmosOptions, Promise<Container>> = (opts) => {
  let client: Promise<Container> | undefined;
  let cosmosClient: CosmosClientType | undefined;
  const getCosmosClient = () =>
    (client ??= (async () => {
      if (!opts.endpoint) {
        throw createRequiredError(DRIVER_NAME, "endpoint");
      }
      const { CosmosClient } = await importLib(
        DRIVER_NAME,
        "@azure/cosmos",
        opts.lib,
        () => import("@azure/cosmos"),
      );
      cosmosClient = opts.accountKey
        ? new CosmosClient({ endpoint: opts.endpoint, key: opts.accountKey })
        : new CosmosClient({
            endpoint: opts.endpoint,
            aadCredentials: await createDefaultAzureCredential(DRIVER_NAME, opts),
          });
      const { database } = await cosmosClient.databases.createIfNotExists({
        id: opts.databaseName || "unstorage",
      });
      const { container } = await database.containers.createIfNotExists({
        id: opts.containerName || "unstorage",
      });
      return container;
    })());

  return {
    name: DRIVER_NAME,
    options: opts,
    getInstance: getCosmosClient,
    async hasItem(key) {
      const item = await (await getCosmosClient()).item(key).read<AzureCosmosItem>();
      return item.resource ? true : false;
    },
    async getItem(key) {
      const item = await (await getCosmosClient()).item(key).read<AzureCosmosItem>();
      return item.resource ? item.resource.value : null;
    },
    async setItem(key, value) {
      const modified = new Date();
      await (
        await getCosmosClient()
      ).items.upsert<AzureCosmosItem>(
        { id: key, value, modified },
        { consistencyLevel: "Session" },
      );
    },
    async removeItem(key) {
      await (
        await getCosmosClient()
      )
        .item(key)
        .delete<AzureCosmosItem>({ consistencyLevel: "Session" });
    },
    async getKeys() {
      const iterator = (await getCosmosClient()).items.query<AzureCosmosItem>(
        `SELECT { id } from c`,
      );
      return (await iterator.fetchAll()).resources.map((item) => item.id);
    },
    async getMeta(key) {
      const item = await (await getCosmosClient()).item(key).read<AzureCosmosItem>();
      return {
        mtime: item.resource?.modified ? new Date(item.resource.modified) : undefined,
      };
    },
    async clear() {
      const iterator = (await getCosmosClient()).items.query<AzureCosmosItem>(
        `SELECT { id } from c`,
      );
      const items = (await iterator.fetchAll()).resources;
      for (const item of items) {
        await (
          await getCosmosClient()
        )
          .item(item.id)
          .delete<AzureCosmosItem>({ consistencyLevel: "Session" });
      }
    },
    async dispose() {
      if (client) {
        // Wait for any pending connection attempt to settle before disposing it
        await client.catch(() => {});
        client = undefined;
        // Clears the background endpoint refresher kept alive by the client
        cosmosClient?.dispose();
        cosmosClient = undefined;
      }
    },
  };
};

export default driver;
