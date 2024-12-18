import { describe } from "vitest";
import s3Driver from "../../src/drivers/s3";
import { testDriver } from "./utils";

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
  });
});
