import { describe, it, expect } from "vitest";
import * as opfsPonyfill from "file-system-access";
import opfsPonyfillMemoryAdapter from "file-system-access/lib/adapters/memory.js";

import { readFile } from "../../src/drivers/utils/opfs-utils";
import { testDriver } from "./utils";
import driver from "../../src/drivers/opfs";

describe("drivers: opfs", async () => {
  const opfs = await opfsPonyfill.getOriginPrivateDirectory(
    opfsPonyfillMemoryAdapter
  );

  testDriver({
    driver: driver({ fs: opfs }),
    additionalTests(ctx) {
      it("check filesystem", async () => {
        expect(await readFile(opfs, "s1/a", "utf8")).toBe("test_data");
      });

      it("native meta", async () => {
        const meta = await ctx.storage.getMeta("/s1/a");
        expect(meta.mtime?.constructor.name).toBe("Date");
        expect(meta.size).toBeGreaterThan(0);
      });

      const invalidKeys = ["../foobar", "..:foobar", "../", "..:", ".."];
      for (const key of invalidKeys) {
        it("disallow path travesal: ", async () => {
          await expect(ctx.storage.getItem(key)).rejects.toThrow("Invalid key");
        });
      }

      it("allow double dots in filename: ", async () => {
        await ctx.storage.setItem("s1/te..st..js", "ok");
        expect(await ctx.storage.getItem("s1/te..st..js")).toBe("ok");
      });
    },
  });
});
