import { describe, afterAll } from "vitest";
import driver from "../../src/drivers/myjson";
import { testDriver } from "./utils";

describe("drivers: myjson", async () => {
  testDriver({
    driver: driver({
      accessToken: "YOUR ACCESS_TOKEN",
      collectionId: "YOUR COLLECTION_ID",
    }),
  });
});
