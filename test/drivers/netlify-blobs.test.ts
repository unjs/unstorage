import { afterAll, beforeAll, describe } from "vitest";
import driver from "../../src/drivers/netlify-blobs";
import { testDriver } from "./utils";
import { BlobsServer } from "@netlify/blobs";

describe("drivers: netlify-blobs", () => {
  let server: BlobsServer;
  const token = "mock";
  const siteID = "1";
  beforeAll(async () => {
    server = new BlobsServer({
      directory: "./.netlify/blobs",
      debug: true,
      token,
      port: 8971,
    });
    await server.start();
  });

  testDriver({
    driver: driver({
      name: "test",
      edgeURL: `http://localhost:8971`,
      token,
      siteID,
    }),
  });

  afterAll(async () => {
    await server.stop();
  });
});
