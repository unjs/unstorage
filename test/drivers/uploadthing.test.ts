import { describe } from "vitest";
import driver from "../../src/drivers/uploadthing";
import { testDriver } from "./utils";

const utfsToken = process.env.VITE_UPLOADTHING_TOKEN;

describe.skipIf(!utfsToken)("drivers: uploadthing", { timeout: 30e3 }, () => {
  process.env.UPLOADTHING_TOKEN = utfsToken;
  testDriver({
    driver: driver({
      base: Math.round(Math.random() * 1_000_000).toString(16),
    }),
  });
});
