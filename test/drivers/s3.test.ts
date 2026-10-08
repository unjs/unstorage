import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import s3Driver from "../../src/drivers/s3";
import { testDriver } from "./utils";
import { createStorage } from "../../src";
import { AwsClient } from "aws4fetch";

const accessKeyId = process.env.VITE_S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.VITE_S3_SECRET_ACCESS_KEY;
const bucket = process.env.VITE_S3_BUCKET;
const endpoint = process.env.VITE_S3_ENDPOINT;
const region = process.env.VITE_S3_REGION;

describe("drivers: s3 (keys)", () => {
  const requests: string[] = [];
  beforeEach(() => {
    requests.length = 0;
    vi.stubGlobal("fetch", async (request: Request) => {
      requests.push(request.url);
      return new Response(null, {
        status: request.method === "DELETE" ? 204 : 404,
      });
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const createDriver = (bucket: string) =>
    s3Driver({
      accessKeyId: "test",
      secretAccessKey: "test",
      endpoint: "https://s3.amazonaws.com",
      region: "us-east-1",
      bucket,
    });

  for (const bucket of ["my-bucket", ""]) {
    it(`rejects keys escaping bucket (bucket: ${JSON.stringify(bucket)})`, async () => {
      const storage = createStorage({ driver: createDriver(bucket) });
      for (const key of [
        "",
        "../secret",
        "foo/../../other-bucket/key",
        "foo:..",
      ]) {
        await expect(storage.setItem(key, "x"), key).rejects.toThrow(
          "Invalid key"
        );
        await expect(storage.getItem(key), key).rejects.toThrow("Invalid key");
        await expect(storage.hasItem(key), key).rejects.toThrow("Invalid key");
        await expect(storage.removeItem(key), key).rejects.toThrow(
          "Invalid key"
        );
      }
      expect(requests).toEqual([]);
    });
  }

  it("encodes special characters in object keys", async () => {
    const driver = createDriver("my-bucket");
    const storage = createStorage({ driver });
    const keys: [string, string][] = [
      ["foo:bar", "foo/bar"],
      ["#", "%23"],
      [" ", "%20"],
      ["a#b", "a%23b"],
      ["a+b", "a%2Bb"],
      ["a%20b", "a%2520b"],
      ["%2e%2e:secret", "%252e%252e/secret"],
      [".\t.:secret", ".%09./secret"],
      ["..\n:secret", "..%0A/secret"],
      [".. ", "..%20"],
    ];
    for (const [key, path] of keys) {
      requests.length = 0;
      await storage.removeItem(key);
      await storage.getItem(key);
      expect(requests, key).toEqual([
        `https://s3.amazonaws.com/my-bucket/${path}`,
        `https://s3.amazonaws.com/my-bucket/${path}`,
      ]);
    }

    // Raw driver keys can not select bucket sub-resources
    requests.length = 0;
    await driver.removeItem!("?policy", {});
    await driver.removeItem!("x?acl", {});
    expect(requests).toEqual([
      "https://s3.amazonaws.com/my-bucket/%3Fpolicy",
      "https://s3.amazonaws.com/my-bucket/x%3Facl",
    ]);

    // Raw driver methods reject (instead of throwing synchronously)
    await expect(driver.getItem("..", {})).rejects.toThrow("Invalid key");
    await expect(driver.getItemRaw!("..", {})).rejects.toThrow("Invalid key");
  });
});

describe.skipIf(
  !accessKeyId || !secretAccessKey || !bucket || !endpoint || !region
)("drivers: s3", () => {
  testDriver({
    driver: () =>
      s3Driver({
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
        bucket: bucket!,
        endpoint: endpoint!,
        region: region!,
      }),
    additionalTests(ctx) {
      it("can access directly with / separator", async () => {
        await ctx.storage.set("foo/bar:baz", "ok");
        expect(await ctx.storage.get("foo/bar:baz")).toBe("ok");

        const client = new AwsClient({
          accessKeyId: accessKeyId!,
          secretAccessKey: secretAccessKey!,
          region,
        });
        const response = await client.fetch(
          `${endpoint}/${bucket}/foo/bar/baz`,
          {
            method: "GET",
          }
        );
        expect(response.status).toBe(200);
        expect(await response.text()).toBe("ok");
      });
    },
  });
});
