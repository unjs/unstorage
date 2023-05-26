import { afterAll, beforeAll, describe } from "vitest";
import driver, { KVHTTPOptions } from "../../src/drivers/cloudflare-kv-http";
import { testDriver } from "./utils";
import { rest } from "msw";
import { setupServer } from "msw/node";

const mockOptions: KVHTTPOptions = {
  apiToken: "api-token",
  accountId: "123456789",
  namespaceId: "123456789",
};

const baseURL =
  `https://api.cloudflare.com/client/v4/accounts/${mockOptions.accountId}/storage/kv/namespaces/${mockOptions.namespaceId}` as const;

const store: Record<string, any> = {};
const optionStore: Record<string, any> = {};

const server = setupServer(
  rest.get(`${baseURL}/values/:key`, ({ params }) => {
    const key = params.key as string;
    return new Response(JSON.stringify(store[key] ?? null), {
      headers: { "content-type": "application/octet-stream" },
    });
  }),

  rest.get(`${baseURL}/metadata/:key`, ({ params }) => {
    const key = params.key as string;
    if (!(key in store)) {
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    }
    return new Response(JSON.stringify({ success: true }));
  }),

  rest.put(`${baseURL}/values/:key`, async ({ params, request }) => {
    const key = params.key as string;
    store[key] = await request.text();
    return new Response(null, { status: 204 });
  }),

  rest.put(`${baseURL}/bulk`, async ({ request }) => {
    const items = (await request.json()) as Record<string, any>[];
    if (!items) return new Response(null, { status: 404 });
    for (const item of items) {
      const { key, value, ...options } = item;
      store[key] = value;
      optionStore[key] = options;
    }
    return new Response(null, { status: 204 });
  }),

  rest.delete(`${baseURL}/values/:key`, ({ params }) => {
    const key = params.key as string;
    delete store[key];
    return new Response(null, { status: 204 });
  }),

  rest.get(`${baseURL}/keys`, ({ params }) => {
    const prefix = params.prefix as string;
    const keys = Object.keys(store);
    const filteredKeys = prefix
      ? keys.filter((key) => key.startsWith(prefix))
      : keys;
    const result = filteredKeys.map((key) => ({ name: key }));

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
    return new Response(JSON.stringify(data));
  }),

  rest.delete(`${baseURL}/bulk`, () => {
    Object.keys(store).forEach((key) => delete store[key]);
    return new Response(null, { status: 204 });
  })
);

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
