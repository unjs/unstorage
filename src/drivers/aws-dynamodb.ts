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
  expireIn?: number;
}

const DRIVER_NAME = "aws-dynamodb";

export default defineDriver((opts: DynamoDBStorageOptions) => {
  if (!opts.table) {
    throw createRequiredError(DRIVER_NAME, "table");
  }

  if (!opts.attributes) {
    opts.attributes = {
      key: "key",
      value: "value",
      ttl: "ttl",
    };
  } else {
    if (!opts.attributes.key) {
      opts.attributes.key = "key";
    }

    if (!opts.attributes.value) {
      opts.attributes.value = "value";
    }

    if (!opts.attributes.ttl) {
      opts.attributes.value = "ttl";
    }
  }

  opts.expireIn =
    opts.expireIn === undefined ? 0 : parseInt(`${opts.expireIn}`);
  if (Number.isNaN(opts.expireIn) || opts.expireIn < 0) {
    throw createError(DRIVER_NAME, "Invalid option `expireIn`.");
  }

  let client;
  function getClient(): DynamoDBDocumentClient {
    if (!client) {
      client = DynamoDBDocumentClient.from(
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
    const obj = {};
    obj[opts.attributes.key] = key;
    if (value) {
      obj[opts.attributes.value] = value;
    }
    if (ttl > 0) {
      const timestamp = Math.round(Date.now() / 1000);
      obj[opts.attributes.ttl] = timestamp + ttl;
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

    if (opts.expireIn > 0) {
      const timestamp = getTimestamp();
      if (timestamp > parseInt(item.ttl || 0)) {
        return null;
      }
    }

    return item[opts.attributes.value];
  }

  async function putItemValue(key: string, value: any): Promise<void> {
    await getClient().send(
      new PutCommand({
        TableName: opts.table,
        Item: createObject(key, value, opts.expireIn),
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

  async function listKeys(startKey = undefined) {
    let { Items: items, LastEvaluatedKey: lastKey } = await getClient().send(
      new ScanCommand({
        TableName: opts.table,
        ExclusiveStartKey: startKey,
      })
    );

    if (opts.expireIn > 0) {
      const timestamp = getTimestamp();
      items = items.filter((item) => parseInt(item.ttl || 0) >= timestamp);
    }

    let keys = items.map((item) => item[opts.attributes.key]);
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
    async setItem(key, value) {
      await putItemValue(key, value);
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
