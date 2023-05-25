import { describe, beforeAll, afterAll } from "vitest";
import driver, { DynamoDBStorageOptions } from "../../src/drivers/aws-dynamodb";
import { testDriver } from "./utils";
import { fromIni } from "@aws-sdk/credential-providers";
import {
  DynamoDBClient,
  CreateTableCommand,
  DeleteTableCommand,
  waitUntilTableExists,
  waitUntilTableNotExists,
} from "@aws-sdk/client-dynamodb";

const TABLE_OPERATIONS_TIMEOUT_SECONDS = 30; // table need at lest 30s from creation to become available

describe("drivers: aws-dynamodb", () => {
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
  const credentials = fromIni({
    profile:
      process.env.AWS_PROFILE || process.env.AWS_DEFAULT_PROFILE || "default",
  });

  const options: DynamoDBStorageOptions = {
    table: "tmp-unstorage-tests",
    region,
    credentials,
    attributes: {
      key: "key",
      value: "value",
    },
  };

  const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials,
  });

  beforeAll(async () => {
    await client.send(
      new CreateTableCommand({
        TableName: options.table,
        BillingMode: "PAY_PER_REQUEST",
        AttributeDefinitions: [
          {
            AttributeName: options.attributes?.key,
            AttributeType: "S",
          },
        ],
        KeySchema: [
          {
            AttributeName: options.attributes?.key,
            KeyType: "HASH",
          },
        ],
      })
    );

    await waitUntilTableExists(
      { client, maxWaitTime: TABLE_OPERATIONS_TIMEOUT_SECONDS },
      { TableName: options.table }
    );
  }, (TABLE_OPERATIONS_TIMEOUT_SECONDS + 2) * 1000);

  afterAll(async () => {
    await client.send(
      new DeleteTableCommand({
        TableName: options.table,
      })
    );

    await waitUntilTableNotExists(
      { client, maxWaitTime: TABLE_OPERATIONS_TIMEOUT_SECONDS },
      { TableName: options.table }
    );
  }, (TABLE_OPERATIONS_TIMEOUT_SECONDS + 2) * 1000);

  testDriver({
    driver: driver(options),
  });
});
