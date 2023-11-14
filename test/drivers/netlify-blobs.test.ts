import { afterAll, beforeAll, describe } from "vitest";
import driver from "../../src/drivers/netlify-blobs";
import { testDriver } from "./utils";
import { BlobsServer } from "@netlify/blobs";
import { resolve } from "path";
import { rm, mkdir } from "node:fs/promises";

describe("drivers: netlify-blobs", async () => {
  const dataDir = resolve(__dirname, "tmp/netlify-blobs");
  await rm(dataDir, { recursive: true, force: true }).catch(() => {});
  await mkdir(dataDir, { recursive: true });

  let server: BlobsServer;
  const token = "mock";
  const siteID = "1";
  beforeAll(async () => {
    server = new BlobsServer({
      directory: dataDir,
      debug: !true,
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

  testDriver({
    driver: driver({
      deployScoped: true,
      edgeURL: `http://localhost:8971`,
      token,
      siteID,
      deployID: "test",
    }),
  });

  afterAll(async () => {
    await server.stop();
  });
});
