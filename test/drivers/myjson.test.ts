import { describe } from "vitest";
import driver from "../../src/drivers/myjson";
import { testDriver } from "./utils";

const accessToken = process.env.VITE_MYJSON_ACCESS_TOKEN;
const collectionId = process.env.VITE_MYJSON_COLLECTION_ID;

describe.skipIf(!accessToken || !collectionId)("drivers: myjson", async () => {
  process.env.MYJSON_ACCESS_TOKEN = accessToken;
  process.env.MYJSON_COLLECTION_ID = collectionId;
  testDriver({
    driver: () => driver({}),
  });
});
