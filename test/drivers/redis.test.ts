import { afterAll, beforeAll, describe } from "vitest";
import driver from "../../src/drivers/redis";
import { testDriver } from "./utils";
import { RedisMemoryServer } from "redis-memory-server";

const redisServer = new RedisMemoryServer();
const host = await redisServer.getHost();
const port = await redisServer.getPort();
const redisUrl = `redis://${host}:${port}`;

describe("drivers: redis", () => {
  testDriver({
    driver: driver({ host, port, base: "unstorage" }),
  });
  testDriver({
    driver: driver({ url: redisUrl }),
  });
  afterAll(async () => {
    await redisServer.stop();
  });
});
