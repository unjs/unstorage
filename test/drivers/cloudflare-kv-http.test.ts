import { afterAll, beforeAll, describe, expect, test } from "vitest";
import driver, { KVHTTPOptions } from "../../src/drivers/cloudflare-kv-http";
import { testDriver } from "./utils";
import { rest } from "msw";
import { setupServer } from "msw/node";

const baseURL =
  "https://api.cloudflare.com/client/v4/accounts/:accountId/storage/kv/namespaces/:namespaceId";

const store: Record<string, any> = {};

const server = setupServer(
  rest.get(`${baseURL}/values/:key`, (req, res, ctx) => {
    const key = req.params.key as string;
    if (!(key in store)) {
      return res(ctx.status(404), ctx.json(null));
    }
    return res(
      ctx.status(200),
      ctx.set("content-type", "application/octet-stream"),
      ctx.body(store[key])
    );
  }),

  rest.get(`${baseURL}/metadata/:key`, (req, res, ctx) => {
    const key = req.params.key as string;
    if (!(key in store)) {
      return res(ctx.status(404), ctx.json({ success: false }));
    }
    return res(ctx.status(200), ctx.json({ success: true }));
  }),

  rest.put(`${baseURL}/values/:key`, async (req, res, ctx) => {
    const key = req.params.key as string;
    store[key] = await req.text();
    return res(ctx.status(204), ctx.json(null));
  }),

  rest.delete(`${baseURL}/values/:key`, (req, res, ctx) => {
    const key = req.params.key as string;
    delete store[key];
    return res(ctx.status(204));
  }),

  rest.get(`${baseURL}/keys`, (req, res, ctx) => {
    const prefix = req.url.searchParams.get("prefix") || "";
    let keys = Object.keys(store);
    if (req.url.searchParams.has("prefix")) {
      keys = keys.filter((key) => key.startsWith(prefix));
    }
    const result = keys.map((key) => ({ name: key }));

    const data = {
      result,
      success: true,
      errors: [],
      messages: [],
      result_info: {
        count: keys.length,
        cursor: "",
      },
    };

    return res(ctx.status(200), ctx.json(data));
  }),

  rest.delete(`${baseURL}/bulk`, (_req, res, ctx) => {
    for (const key of Object.keys(store)) delete store[key];
    return res(ctx.status(204));
  })
);

const mockOptions: KVHTTPOptions = {
  base: "base",
  apiToken: "api-token",
  accountId: "account-id",
  namespaceId: "namespace-id",
};

// TODO: Fix msw compatibility with Node 18
const isNode18 = Number.parseInt(process.version.slice(1).split(".")[0]) >= 18;
describe.skipIf(isNode18)("drivers: cloudflare-kv-http", () => {
  beforeAll(() => {
    // Establish requests interception layer before all tests.
    server.listen();
  });
  afterAll(() => {
    // Clean up after all tests are done, preventing this
    // interception layer from affecting irrelevant tests.
    server.close();
  });

  testDriver({
    driver: driver(mockOptions),
    async additionalTests() {
      test("snapshot", async () => {
        expect(store).toMatchInlineSnapshot(`
          {
            "base:data:raw.bin": "base64:AQID",
            "base:data:serialized1.json": "SERIALIZED",
            "base:data:serialized2.json": "{\\"serializedObj\\":\\"works\\"}",
            "base:data:test.json": "{\\"json\\":\\"works\\"}",
            "base:data:true.json": "true",
            "base:my-false-flag": "false",
            "base:s1:a": "test_data",
            "base:s2:a": "test_data",
            "base:s3:a": "test_data",
            "base:t:1": "test_data_t1",
            "base:t:2": "test_data_t2",
            "base:t:3": "test_data_t3",
            "base:v1:a": "test_data_v1:a",
            "base:v2:a": "test_data_v2:a",
            "base:v3:a": "test_data_v3:a?q=1",
            "base:zero": "0",
          }
        `);
      });
    },
  });
});
