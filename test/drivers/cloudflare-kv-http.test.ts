import { describe } from "vitest";
import cfKvHttpDriver from "../../src/drivers/cloudflare-kv-http.ts";
import { testDriver } from "./utils.ts";

const accountId = process.env.VITE_CLOUDFLARE_ACC_ID;
const namespaceId = process.env.VITE_CLOUDFLARE_KV_NS_ID;
const apiToken = process.env.VITE_CLOUDFLARE_TOKEN;

describe.skipIf(!accountId || !namespaceId || !apiToken)("drivers: cloudflare-kv-http", () => {
  testDriver({
    driver: () =>
      cfKvHttpDriver({
        accountId: accountId!,
        namespaceId: namespaceId!,
        apiToken: apiToken!,
        base: Math.round(Math.random() * 1_000_000).toString(16),
      }),
  });
});
