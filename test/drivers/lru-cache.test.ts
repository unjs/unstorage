import { it, describe, expect } from "vitest";
import driver from "../../src/drivers/lru-cache";
import { testDriver } from "./utils";

describe("drivers: lru-cache", () => {
  testDriver({
    driver: driver(),
  });
});

describe("drivers: lru-cache with size", () => {
  testDriver({
    driver: driver({
      maxEntrySize: 50,
    }),
    additionalTests({ storage }) {
      it("should not store large items", async () => {
        await storage.setItem(
          "big",
          "0123456789012345678901234567890123456789012345678901234567890123456789"
        );
        expect(await storage.getItem("big")).toBe(undefined);

        await storage.setItemRaw("bigBuff", Buffer.alloc(100));
        expect(await storage.getItemRaw("bigBuff")).toBe(undefined);
      });
    },
  });
});
