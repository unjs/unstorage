import { createError, createRequiredError, defineDriver } from "./utils";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";

export interface DynamoDBStorageOptions {
  table: string;
  region?: string;
  credentials?: any;
  attributes?: {
    key?: string;
    value?: string;
    ttl?: string;
  };
  ttl?: number;
  client?: DynamoDBDocumentClient;
}

export interface DynamoDBSetItemOptions {
  ttl?: number;
}

const DRIVER_NAME = "aws-dynamodb";

export default defineDriver((opts: DynamoDBStorageOptions) => {
  const ttl = opts.ttl !== undefined ? parseInt(String(opts.ttl)) : 0;

  const attributes = {
    key: "key",
    value: "value",
    ttl: "ttl",
    ...opts.attributes,
  };

  let client: DynamoDBDocumentClient;
  function getClient(): DynamoDBDocumentClient {
    if (!opts.table) {
      throw createRequiredError(DRIVER_NAME, "table");
    }
    if (Number.isNaN(ttl) || ttl < 0) {
      throw createError(DRIVER_NAME, "Invalid option `ttl`.");
    }
    if (!client) {
      client =
        opts.client ||
        DynamoDBDocumentClient.from(
          new DynamoDBClient({
            region: opts.region,
            credentials: opts.credentials,
          })
        );
    }
    return client;
  }

  function getTimestamp(): number {
    return Math.round(Date.now() / 1000);
  }

  function createObject(key: string, value: any = undefined, ttl: number = 0) {
    const obj: Record<string, any> = {};
    obj[attributes.key] = key;
    if (value) {
      obj[attributes.value] = value;
    }
    if (ttl > 0) {
      const timestamp = Math.round(Date.now() / 1000);
      obj[attributes.ttl] = timestamp + ttl;
    }
    return obj;
  }

  async function getItemValue(key: string): Promise<any> {
    const { Item: item } = await getClient().send(
      new GetCommand({
        TableName: opts.table,
        Key: createObject(key),
      })
    );

    if (!item) {
      return null;
    }

    if (ttl > 0) {
      const timestamp = getTimestamp();
      if (timestamp > parseInt(item.ttl || 0)) {
        return null;
      }
    }

    return item[attributes.value];
  }

  async function putItemValue(
    key: string,
    value: any,
    options: DynamoDBSetItemOptions = {}
  ): Promise<void> {
    const ttlOverride =
      options.ttl !== undefined ? parseInt(String(options.ttl)) : ttl;
    if (Number.isNaN(ttlOverride) || ttlOverride < 0) {
      throw createError(DRIVER_NAME, "Invalid option `ttl`.");
    }

    await getClient().send(
      new PutCommand({
        TableName: opts.table,
        Item: createObject(key, value, ttlOverride),
      })
    );
  }

  async function removeItem(key: string): Promise<void> {
    await getClient().send(
      new DeleteCommand({
        TableName: opts.table,
        Key: createObject(key),
      })
    );
  }

  async function listKeys(startKey: any = undefined) {
    let { Items: items, LastEvaluatedKey: lastKey } = await getClient().send(
      new ScanCommand({
        TableName: opts.table,
        ExclusiveStartKey: startKey,
      })
    );

    items = items || [];

    if (ttl > 0) {
      const timestamp = getTimestamp();
      items = items.filter((item) => parseInt(item.ttl || 0) >= timestamp);
    }

    let keys = items.map((item) => item[attributes.key]);
    if (lastKey) {
      keys = keys.concat(await listKeys(lastKey));
    }

    return keys;
  }

  return {
    name: DRIVER_NAME,
    options: opts,
    async hasItem(key) {
      const item = await getItemValue(key);
      return !!item;
    },
    async getItem(key) {
      return await getItemValue(key);
    },
    async setItem(key, value, opts: DynamoDBSetItemOptions = {}) {
      await putItemValue(key, value, opts);
    },
    async removeItem(key) {
      await removeItem(key);
    },
    async getKeys() {
      return await listKeys();
    },
    async clear() {
      const keys = await listKeys();
      await Promise.all(keys.map((key) => removeItem(key)));
    },
  };
});
