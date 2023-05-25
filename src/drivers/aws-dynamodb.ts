import { createRequiredError, defineDriver } from "./utils";
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
  };
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
    };
  } else {
    if (!opts.attributes.key) {
      opts.attributes.key = "key";
    }

    if (!opts.attributes.value) {
      opts.attributes.value = "value";
    }
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

  function createObject(key: string, value: any = null) {
    const obj = {};
    obj[opts.attributes.key] = key;
    if (value) {
      obj[opts.attributes.value] = value;
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
    return item[opts.attributes.value];
  }

  async function putItemValue(key: string, value: any): Promise<void> {
    await getClient().send(
      new PutCommand({
        TableName: opts.table,
        Item: createObject(key, value),
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
    const { Items: items, LastEvaluatedKey: lastKey } = await getClient().send(
      new ScanCommand({
        TableName: opts.table,
        ExclusiveStartKey: startKey,
      })
    );

    let keys = items.map((item) => item[opts.attributes.key] || null);
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
