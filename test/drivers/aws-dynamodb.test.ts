import { describe, afterEach, beforeEach } from "vitest";
import driver, { DynamoDBStorageOptions } from "../../src/drivers/aws-dynamodb";
import { testDriver } from "./utils";
import { mockClient } from "aws-sdk-client-mock";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = "mocked";

// Mocked in-memory data
let data = new Map();

describe("drivers: aws-dynamodb", () => {
  // Init mocked client for test purpose

  const client = mockClient(DynamoDBDocumentClient);

  // Add command resolvers

  client
    .on(GetCommand)
    .callsFake((input) => {
      const key = input.Key.key;
      if (!data.has(key)) {
        return { Item: undefined };
      }
      return { Item: { key, value: data.get(key) } };
    })
    .on(ScanCommand)
    .callsFake(() => {
      return {
        Items: Array.from(data.entries()).map(([key, value]) => ({
          key,
          value,
        })),
      };
    })
    .on(PutCommand)
    .callsFake((input) => {
      data.set(input.Item.key, input.Item.value);
    })
    .on(DeleteCommand)
    .callsFake((input) => {
      data.delete(input.Key.key);
    });

  // Setup test driver options

  const options: DynamoDBStorageOptions = {
    table: TABLE_NAME,
    region: "us-east-1",
    credentials: {},
    attributes: {
      key: "key",
      value: "value",
      ttl: "ttl",
    },
    ttl: 0,
    client: client as unknown as DynamoDBDocumentClient,
  };

  // Common tests

  testDriver({
    driver: driver(options),
    additionalTests: () => {},
  });
});
