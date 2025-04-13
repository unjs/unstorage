import { describe, it, expect } from "vitest";
import s3Driver from "../../src/drivers/s3";
import { testDriver } from "./utils";
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
        base: endpoint!,
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
