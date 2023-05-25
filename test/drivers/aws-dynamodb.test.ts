import { describe, beforeAll, afterAll, expect, it } from "vitest";
import driver, { DynamoDBStorageOptions } from "../../src/drivers/aws-dynamodb";
import { testDriver } from "./utils";
import { fromIni, fromEnv } from "@aws-sdk/credential-providers";
import {
  DynamoDBClient,
  CreateTableCommand,
  UpdateTimeToLiveCommand,
  DeleteTableCommand,
  waitUntilTableExists,
  waitUntilTableNotExists,
  GetItemCommand,
} from "@aws-sdk/client-dynamodb";

const TABLE_OPERATIONS_TIMEOUT_SECONDS = 30; // table need at lest 30s from creation to become available

describe("drivers: aws-dynamodb", () => {
  // Load AWS credentials

  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
  const profile = process.env.AWS_PROFILE || process.env.AWS_DEFAULT_PROFILE;
  const credentials = profile
    ? fromIni({
        profile: profile,
      })
    : fromEnv();

  // Init client for test purpose

  const client = new DynamoDBClient({
    region,
    credentials,
  });

  // Setup test driver options

  const options: DynamoDBStorageOptions = {
    table: "tmp-unstorage-tests",
    region,
    credentials,
    attributes: {
      key: "key",
      value: "value",
      ttl: "ttl",
    },
    expireIn: 300,
  };

  // Test hooks

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

    await client.send(
      new UpdateTimeToLiveCommand({
        TableName: options.table,
        TimeToLiveSpecification: {
          AttributeName: options.attributes?.ttl,
          Enabled: true,
        },
      })
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

  // Common tests

  testDriver({
    driver: driver(options),
    additionalTests: (ctx) => {
      // Additional tests

      it("should set TTL attribute on item", async () => {
        const timestamp = Math.round(Date.now() / 1000);

        await ctx.storage.setItem("test-with-ttl", "ok");

        const key = {};
        key[options.attributes?.key as string] = {
          S: "test-with-ttl",
        };

        const { Item: item } = await client.send(
          new GetItemCommand({
            TableName: options.table,
            Key: key,
          })
        );

        expect(item).not.toBeUndefined();
        expect(item?.[options.attributes?.value as string].S).toBe("ok");
        expect(item?.[options.attributes?.ttl as string].N).not.toBeUndefined();
        expect(
          parseInt(item?.[options.attributes?.ttl as string].N as string)
        ).toBeGreaterThanOrEqual(timestamp + (options.expireIn || 0));
      });
    },
  });
});
