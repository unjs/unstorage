import { describe, it, expect } from "vitest";
import { defineDriver } from "../src";
import { loadFromUrl } from "../src/loader";

interface Options {
  scheme: string;
  base?: string;
  string?: string;
  number?: number;
  boolean?: boolean;
  array?: string[];
  object?: Record<string, string>;
}

const test = defineDriver<Options, any>((options: Options) => ({
  name: "test",
  options: options,
  hasItem: () => false,
  getItem: () => null,
  getKeys: () => [],
}));

describe("loader", () => {
  it("invalid url", () => {
    expect(async () =>
      loadFromUrl("not-a-url", { proto: test })
    ).rejects.toThrowError("invalid url");
  });

  it("missing driver", () => {
    expect(async () =>
      loadFromUrl("no:", { proto: test })
    ).rejects.toThrowError("no driver handle scheme for url");
  });

  it("load driver", async () => {
    const driver = await loadFromUrl(
      'proto:abc?string=def&number=1&boolean=true&array=[2,3,4]&object={"h":5,"i":6,"j":"7"}',
      { proto: test }
    );
    expect(driver.name).toBe("test");
    expect(driver.options.scheme).toBe("proto");
    expect(driver.options.base).toBe("abc");
    expect(driver.options.string).toBe("def");
    expect(driver.options.number).toBe(1);
    expect(driver.options.boolean).toBe(true);
    expect(driver.options.array).toStrictEqual([2, 3, 4]);
    expect(driver.options.object).toStrictEqual({ h: 5, i: 6, j: "7" });
  });
});
