import { afterAll, beforeAll, describe } from "vitest";
import driver from "../../src/drivers/netlify-blobs.ts";
import { testDriver } from "./utils.ts";
import { BlobsServer } from "@netlify/blobs/server";
import { resolve } from "node:path";
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
      // Usually defaulted via the environment; only required in a test environment like this
      region: "us-east-1",
    }),
  });

  afterAll(async () => {
    await server.stop();
  });
});
