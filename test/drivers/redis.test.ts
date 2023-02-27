import { describe, vi } from "vitest";
import * as ioredis from "ioredis-mock";
import driver from "../../src/drivers/redis";
import { testDriver } from "./utils";

vi.mock("ioredis", () => ioredis);

describe("drivers: redis", () => {
  testDriver({
    driver: driver({
      base: "",
      url: "ioredis://localhost:6379/0",
      lazyConnect: false,
    }),
  });
});
