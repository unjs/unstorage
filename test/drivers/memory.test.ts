import { describe, it, expect, vi } from "vitest";
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

  it("retains entries with TTL beyond the native timer limit", async () => {
    const d = driver();
    try {
      d.setItem!("long", "value", { ttl: 30 * 24 * 60 * 60 });
      d.setItemRaw!("long-raw", "raw", { ttl: 30 * 24 * 60 * 60 });
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(d.getItem("long")).toBe("value");
      expect(d.getItemRaw!("long-raw", {})).toBe("raw");
    } finally {
      d.dispose!();
    }
  });

  it("retains long TTL until its deadline and then proactively expires", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
    const d = driver();
    const schedule = vi.spyOn(globalThis, "setTimeout");
    const ttlMs = 30 * 24 * 60 * 60 * 1000;
    const maxDelay = 2 ** 31 - 1;
    try {
      d.setItem!("long", "value", { ttl: ttlMs / 1000 });
      expect(schedule.mock.calls.every((call) => Number(call[1]) <= maxDelay)).toBe(true);
      vi.advanceTimersByTime(ttlMs - 1);
      expect(d.getItem("long")).toBe("value");
      expect(schedule.mock.calls.every((call) => Number(call[1]) <= maxDelay)).toBe(true);
      vi.advanceTimersByTime(1);
      expect(d.getItem("long")).toBeNull();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      d.dispose!();
      schedule.mockRestore();
      vi.useRealTimers();
    }
  });

  it.each(["overwrite", "remove", "clear", "dispose"])(
    "cancels the rearmed long TTL timer on %s",
    (action) => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
      const d = driver();
      try {
        d.setItem!("long", "old", { ttl: 30 * 24 * 60 * 60 });
        vi.advanceTimersByTime(2 ** 31 - 1);
        expect(d.getItem("long")).toBe("old");
        expect(vi.getTimerCount()).toBe(1);
        if (action === "overwrite") d.setItem!("long", "new", {});
        if (action === "remove") d.removeItem!("long", {});
        if (action === "clear") d.clear!("", {});
        if (action === "dispose") d.dispose!();
        expect(vi.getTimerCount()).toBe(0);
        vi.advanceTimersByTime(30 * 24 * 60 * 60 * 1000);
        expect(d.getItem("long")).toBe(action === "overwrite" ? "new" : null);
      } finally {
        d.dispose!();
        vi.useRealTimers();
      }
    },
  );
});
