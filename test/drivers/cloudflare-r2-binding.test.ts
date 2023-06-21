/// <reference types="@cloudflare/workers-types" />
import { describe } from "vitest";
import { createStorage } from "../../src";
import CloudflareR2Binding from "../../src/drivers/cloudflare-r2-binding";
import { testDriver } from "./utils";
import { Miniflare } from "miniflare";

const mf = new Miniflare({
  script: "",
  modules: true,
  r2Buckets: ["MY_BUCKET"],
  r2Persist: true,
});

describe("drivers: cloudflare-r2-binding", () => {
  mf.
  const bucket = testDriver({
    driver: CloudflareR2Binding({ binding: mockBinding }),
  });
});
