import { describe, it, expect } from "vitest";
import driver from "../../src/drivers/planetscale.ts";

describe("drivers: planetscale", () => {
  it("does not mutate input options", () => {
    const opts = { url: "mysql://user:pass@host/db" };
    driver(opts);
    expect(opts).toEqual({ url: "mysql://user:pass@host/db" });
  });
});
