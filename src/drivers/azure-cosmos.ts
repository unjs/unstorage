import { createRequiredError, type DriverFactory } from "./utils/index.ts";
import { CASMismatchError } from "./utils/cas.ts";
import { Container, CosmosClient } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";

export interface AzureCosmosOptions {
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
}

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

  /**
   * Cosmos-managed etag (read-only on the server side).
   */
  _etag?: string;
}

const isStatus = (err: unknown, status: number): boolean =>
  !!err && typeof err === "object" && (err as { code?: number | string }).code === status;

const driver: DriverFactory<AzureCosmosOptions, Promise<Container>> = (opts) => {
  let client: Container;
  const getCosmosClient = async () => {
    if (client) {
      return client;
    }
    if (!opts.endpoint) {
      throw createRequiredError(DRIVER_NAME, "endpoint");
    }
    if (opts.accountKey) {
      const cosmosClient = new CosmosClient({
        endpoint: opts.endpoint,
        key: opts.accountKey,
      });
      const { database } = await cosmosClient.databases.createIfNotExists({
        id: opts.databaseName || "unstorage",
      });
      const { container } = await database.containers.createIfNotExists({
        id: opts.containerName || "unstorage",
      });
      client = container;
    } else {
      const credential = new DefaultAzureCredential();
      const cosmosClient = new CosmosClient({
        endpoint: opts.endpoint,
        aadCredentials: credential,
      });
      const { database } = await cosmosClient.databases.createIfNotExists({
        id: opts.databaseName || "unstorage",
      });
      const { container } = await database.containers.createIfNotExists({
        id: opts.containerName || "unstorage",
      });
      client = container;
    }
    return client;
  };

  const setWithCAS = async (
    key: string,
    value: string,
    tOptions: { ifMatch?: string; ifNoneMatch?: string },
  ): Promise<{ etag: string }> => {
    const container = await getCosmosClient();
    const modified = new Date();
    const body: AzureCosmosItem = { id: key, value, modified };
    const { ifMatch, ifNoneMatch } = tOptions;

    // ifNoneMatch:* — create-only via items.create (409 Conflict on collision).
    if (ifNoneMatch === "*" && ifMatch === undefined) {
      try {
        const res = await container.items.create<AzureCosmosItem>(body, {
          consistencyLevel: "Session",
        });
        return { etag: res.resource?._etag ?? res.etag };
      } catch (err) {
        if (isStatus(err, 409)) throw new CASMismatchError(DRIVER_NAME, key);
        throw err;
      }
    }

    // ifMatch:<etag> — replace with IfMatch precondition (412 on mismatch, 404 if absent).
    if (ifMatch !== undefined && ifMatch !== "*" && ifNoneMatch === undefined) {
      try {
        const res = await container.item(key).replace<AzureCosmosItem>(body, {
          accessCondition: { type: "IfMatch", condition: ifMatch },
          consistencyLevel: "Session",
        });
        return { etag: res.resource?._etag ?? res.etag };
      } catch (err) {
        if (isStatus(err, 412) || isStatus(err, 404)) {
          throw new CASMismatchError(DRIVER_NAME, key);
        }
        throw err;
      }
    }

    // ifMatch:* — require existence; replace without etag pinning (404 if absent).
    if (ifMatch === "*" && ifNoneMatch === undefined) {
      try {
        const res = await container.item(key).replace<AzureCosmosItem>(body, {
          consistencyLevel: "Session",
        });
        return { etag: res.resource?._etag ?? res.etag };
      } catch (err) {
        if (isStatus(err, 404)) throw new CASMismatchError(DRIVER_NAME, key);
        throw err;
      }
    }

    // Remaining shapes (ifNoneMatch:<etag>, combined): read-then-conditional-replace.
    // Cosmos accessCondition only supports a single header per request, so combined
    // preconditions and "ifNoneMatch:<etag>" are evaluated client-side, then the
    // write is pinned to the observed etag for atomicity.
    const existing = await container
      .item(key)
      .read<AzureCosmosItem>()
      .catch((err) => {
        if (isStatus(err, 404)) {
          return { resource: undefined as AzureCosmosItem | undefined, etag: "" };
        }
        throw err;
      });
    const exists = !!existing.resource;
    const curEtag = existing.resource?._etag;

    if (ifNoneMatch !== undefined) {
      const mismatch =
        ifNoneMatch === "*" ? exists : exists && curEtag === ifNoneMatch;
      if (mismatch) throw new CASMismatchError(DRIVER_NAME, key);
    }
    if (ifMatch !== undefined) {
      const mismatch =
        ifMatch === "*" ? !exists : !exists || curEtag !== ifMatch;
      if (mismatch) throw new CASMismatchError(DRIVER_NAME, key);
    }

    if (!exists) {
      try {
        const res = await container.items.create<AzureCosmosItem>(body, {
          consistencyLevel: "Session",
        });
        return { etag: res.resource?._etag ?? res.etag };
      } catch (err) {
        if (isStatus(err, 409)) throw new CASMismatchError(DRIVER_NAME, key);
        throw err;
      }
    }
    try {
      const res = await container.item(key).replace<AzureCosmosItem>(body, {
        accessCondition: { type: "IfMatch", condition: curEtag! },
        consistencyLevel: "Session",
      });
      return { etag: res.resource?._etag ?? res.etag };
    } catch (err) {
      if (isStatus(err, 412) || isStatus(err, 404)) {
        throw new CASMismatchError(DRIVER_NAME, key);
      }
      throw err;
    }
  };

  return {
    name: DRIVER_NAME,
    flags: { cas: true },
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
    async setItem(key, value, tOptions) {
      if (tOptions?.ifMatch !== undefined || tOptions?.ifNoneMatch !== undefined) {
        return setWithCAS(key, value, tOptions);
      }
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
      if (!item.resource) return null;
      return {
        mtime: item.resource.modified ? new Date(item.resource.modified) : undefined,
        etag: item.resource._etag,
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
  };
};

export default driver;
