import { describe, vi, it, expect, beforeEach } from "vitest";
import nodeRedisDriver from "../../src/drivers/node-redis";
import type { RedisClient, RedisCluster } from "../../src/drivers/node-redis";
import { testDriver } from "./utils";
import { createClient } from "redis";

let database: Record<string, any> = {};

const mocks = vi.hoisted(() => ({
  set: vi
    .fn()
    .mockImplementation(
      (key: string, value: unknown) => (database[key] = value)
    ),
  connect: vi.fn().mockImplementation(async function (
    this: RedisClient | RedisCluster
  ) {
    return this;
  }),
  on: vi.fn(),
}));

// There is no official mocking library at the moment
// https://github.com/redis/node-redis/issues/2546
vi.mock("redis", () => {
  const createClient = () => {
    return {
      connect: mocks.connect,
      on: mocks.on,
      get: (key: string) => database[key],
      mGet: (keys: string[]) => keys.map((key) => database[key]),
      set: mocks.set,
      unlink: (key: string | string[]) => {
        if (Array.isArray(key)) {
          for (const k of key) {
            delete database[k];
          }
        } else {
          delete database[key];
        }
      },
      exists: (key: string) => Boolean(database[key]),
      destroy: vi.fn(),
      scanIterator: async function* () {
        yield Object.keys(database);
      },
      keys: (_pattern: string) => Object.keys(database),
      withTypeMapping: vi.fn().mockImplementation(async function (
        this: RedisClient
      ) {
        return this;
      }),
    };
  };
  return {
    RESP_TYPES: {
      NULL: 95,
      BOOLEAN: 35,
      NUMBER: 58,
      BIG_NUMBER: 40,
      DOUBLE: 44,
      SIMPLE_STRING: 43,
      BLOB_STRING: 36,
      VERBATIM_STRING: 61,
      SIMPLE_ERROR: 45,
      BLOB_ERROR: 33,
      ARRAY: 42,
      SET: 126,
      MAP: 37,
      PUSH: 62,
    },
    createClient,
    createCluster: () => {
      const { scanIterator, ...client } = createClient();
      return {
        ...client,
        masters: [{}],
        nodeClient: () => ({ ...client, scanIterator }),
      };
    },
  };
});

describe("drivers: node-redis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    database = {};
  });

  describe("single instance", () => {
    const driver = nodeRedisDriver({
      base: "test:",
      ttl: 500,
      clientOptions: {
        url: "redis://localhost:6379/0",
      },
    });

    testDriver({
      driver,
      additionalTests(ctx) {
        it("verify stored keys", async () => {
          await ctx.storage.setItem("s1:a", "test_data");
          await ctx.storage.setItem("s2:a", "test_data", { ttl: 100 });
          await ctx.storage.setItem("s3:a?q=1", "test_data");

          expect(mocks.set.mock.calls).toEqual([
            [
              "test:s1:a",
              "test_data",
              { expiration: { type: "EX", value: 500 } },
            ],
            [
              "test:s2:a",
              "test_data",
              { expiration: { type: "EX", value: 100 } },
            ],
            [
              "test:s3:a",
              "test_data",
              { expiration: { type: "EX", value: 500 } },
            ],
          ]);

          const client = createClient();
          const keys = await client.keys("*");
          expect(keys).toMatchInlineSnapshot(`
            [
              "test:s1:a",
              "test:s2:a",
              "test:s3:a",
            ]
          `);
        });
      },
    });
  });

  describe("cluster", () => {
    const driver = nodeRedisDriver({
      base: "test:",
      clusterOptions: {
        rootNodes: [
          {
            url: "redis://localhost:6379/0",
          },
        ],
      },
    });

    testDriver({
      driver,
      additionalTests(ctx) {
        it("verify stored keys", async () => {
          await ctx.storage.setItem("s1:a", "test_data");
          await ctx.storage.setItem("s2:a", "test_data", { ttl: 100 });
          await ctx.storage.setItem("s3:a?q=1", "test_data");

          expect(mocks.set.mock.calls).toEqual([
            ["test:s1:a", "test_data"],
            [
              "test:s2:a",
              "test_data",
              { expiration: { type: "EX", value: 100 } },
            ],
            ["test:s3:a", "test_data"],
          ]);

          const client = createClient();
          const keys = await client.keys("*");
          expect(keys).toMatchInlineSnapshot(`
            [
              "test:s1:a",
              "test:s2:a",
              "test:s3:a",
            ]
          `);
        });
      },
    });
  });

  it("preconnects when configured", () => {
    nodeRedisDriver({
      base: "test:",
      clientOptions: {
        url: "redis://localhost:6379/0",
      },
      preConnect: true,
    });
    expect(mocks.connect).toHaveBeenCalledOnce();
  });

  it("does not preconnect when not configured", () => {
    nodeRedisDriver({
      base: "test:",
      clientOptions: {
        url: "redis://localhost:6379/0",
      },
      preConnect: false,
    });
    expect(mocks.connect).not.toHaveBeenCalledOnce();
  });

  it("registers an error handler", () => {
    nodeRedisDriver({
      base: "test:",
      clientOptions: {
        url: "redis://localhost:6379/0",
      },
      preConnect: true,
    });

    expect(mocks.on).toHaveBeenCalled();
    expect(mocks.on.mock.calls?.[0]?.[0]).toEqual("error");
  });
});
