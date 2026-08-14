import { describe } from "vitest";
import driver from "../../src/drivers/overlay.ts";
import memory from "../../src/drivers/memory.ts";
import { testDriver } from "./utils.ts";

describe("drivers: overlay", () => {
  const [s1, s2] = [memory(), memory()];
  testDriver({
    driver: driver({
      layers: [s1, s2],
    }),
  });
});
