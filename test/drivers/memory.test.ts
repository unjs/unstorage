import { describe, it, expect } from "vitest";
import driver from "../../src/drivers/memory.ts";
import { testDriver } from "./utils.ts";

describe("drivers: memory", () => {
  testDriver({
    driver: driver(),
  });

  // Regression: nitrojs/nitro#2138 — expired entries should be proactively
  // flushed from memory even if never read again.
  it("proactively flushes expired entries after TTL", async () => {
    const d = driver();
    for (let i = 0; i < 10; i++) {
      d.setItem!(`key-${i}`, `val-${i}`, { ttl: 0.01 });
    }
    expect(d.getInstance!().size).toBe(10);

    await new Promise((r) => setTimeout(r, 50));

    expect(d.getInstance!().size).toBe(0);
    for (let i = 0; i < 10; i++) {
      expect(d.getItem(`key-${i}`)).toBeNull();
    }
  });
});
