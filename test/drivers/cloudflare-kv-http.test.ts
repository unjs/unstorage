import { afterAll, beforeAll, describe } from "vitest";
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
    Object.keys(store).forEach((key) => delete store[key]);
    return res(ctx.status(204));
  })
);

const mockOptions: KVHTTPOptions = {
  apiToken: "api-token",
  accountId: "account-id",
  namespaceId: "namespace-id",
};

describe("drivers: cloudflare-kv-http", () => {
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
  });
});
