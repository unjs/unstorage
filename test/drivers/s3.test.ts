import { describe, it, expect } from "vitest";
import s3Driver from "../../src/drivers/s3.ts";
import { testDriver } from "./utils.ts";
import { AwsClient } from "aws4fetch";

const accessKeyId = process.env.VITE_S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.VITE_S3_SECRET_ACCESS_KEY;
const bucket = process.env.VITE_S3_BUCKET;
const endpoint = process.env.VITE_S3_ENDPOINT;
const region = process.env.VITE_S3_REGION;

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

      it("supports Content-Type header in setItemRaw", async () => {
        const buffer = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG magic bytes
        await ctx.storage.setItemRaw("test-image.png", buffer, {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "max-age=31536000",
          },
        });

        const value = await ctx.storage.getItemRaw("test-image.png");

        expect(value).toBeDefined();
      });

      it("supports custom x-amz-meta headers", async () => {
        await ctx.storage.setItem("meta-test.txt", "hello", {
          headers: {
            "Content-Type": "text/plain",
            "x-amz-meta-custom-field": "custom-value",
            "x-amz-meta-author": "john-doe",
            "x-amz-meta-version": "1.0",
          },
        });

        // getMeta only returns x-amz-meta-* custom headers (standard headers are not returned)
        const meta = await ctx.storage.getMeta("meta-test.txt");
        expect(meta).toBeDefined();
        expect(meta?.["custom-field"]).toBe("custom-value");
        expect(meta?.["author"]).toBe("john-doe");
        expect(meta?.["version"]).toBe("1.0");
        // Standard headers like Content-Type are NOT returned by getMeta
        expect(meta?.["contentType"]).toBeUndefined();
      });

      it("works without options (backward compatibility)", async () => {
        await ctx.storage.setItem("compat-test.txt", "content");
        const value = await ctx.storage.getItem("compat-test.txt");
        expect(value).toBe("content");
      });
    },
  });
});
