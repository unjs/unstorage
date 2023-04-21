import { it, expect } from "vitest";
import { Storage, Driver, createStorage, restoreSnapshot } from "../../src";

export interface TestContext {
  storage: Storage;
  driver: Driver;
}

export interface TestOptions {
  driver: Driver;
  additionalTests?: (ctx: TestContext) => void;
}

export function testDriver(opts: TestOptions) {
  const ctx: TestContext = {
    storage: createStorage({ driver: opts.driver }),
    driver: opts.driver,
  };

  it("init", async () => {
    await restoreSnapshot(ctx.storage, { initial: "works" });
    expect(await ctx.storage.getItem("initial")).toBe("works");
    await ctx.storage.clear();
  });

  it("initial state", async () => {
    expect(await ctx.storage.hasItem("s1:a")).toBe(false);
    expect(await ctx.storage.getItem("s2:a")).toBe(undefined);
    expect(await ctx.storage.getKeys()).toMatchObject([]);
  });

  it("setItem", async () => {
    await ctx.storage.setItem("s1:a", "test_data");
    await ctx.storage.setItem("s2:a", "test_data");
    await ctx.storage.setItem("s3:a?q=1", "test_data");
    expect(await ctx.storage.hasItem("s1:a")).toBe(true);
    expect(await ctx.storage.getItem("s1:a")).toBe("test_data");
    expect(await ctx.storage.getItem("s3:a?q=2")).toBe("test_data");
  });

  it("getKeys", async () => {
    expect(await ctx.storage.getKeys().then((k) => k.sort())).toMatchObject(
      ["s1:a", "s2:a", "s3:a"].sort()
    );
    expect(await ctx.storage.getKeys("s1").then((k) => k.sort())).toMatchObject(
      ["s1:a"].sort()
    );
  });

  it("serialize (object)", async () => {
    await ctx.storage.setItem("/data/test.json", { json: "works" });
    expect(await ctx.storage.getItem("/data/test.json")).toMatchObject({
      json: "works",
    });
  });

  it("serialize (primitive)", async () => {
    await ctx.storage.setItem("/data/true.json", true);
    expect(await ctx.storage.getItem("/data/true.json")).toBe(true);
  });

  it("serialize (lossy object with toJSON())", async () => {
    class Test1 {
      toJSON() {
        return "SERIALIZED";
      }
    }
    await ctx.storage.setItem("/data/serialized1.json", new Test1());
    expect(await ctx.storage.getItem("/data/serialized1.json")).toBe(
      "SERIALIZED"
    );
    class Test2 {
      toJSON() {
        return { serializedObj: "works" };
      }
    }
    await ctx.storage.setItem("/data/serialized2.json", new Test2());
    expect(await ctx.storage.getItem("/data/serialized2.json")).toMatchObject({
      serializedObj: "works",
    });
  });

  it("serialize (error for non primitives)", async () => {
    class Test {}
    expect(
      ctx.storage.setItem("/data/badvalue.json", new Test())
    ).rejects.toThrow("[unstorage] Cannot stringify value!");
  });

  it("raw support", async () => {
    const value = new Uint8Array([1, 2, 3]);
    await ctx.storage.setItemRaw("/data/raw.bin", value);
    const rValue = await ctx.storage.getItemRaw("/data/raw.bin");
    if (rValue?.length !== value.length) {
      console.log(rValue);
    }
    expect(rValue?.length).toBe(value.length);
    expect(Buffer.from(rValue).toString("base64")).toBe(
      Buffer.from(value).toString("base64")
    );
  });

  // TODO: Refactor to move after cleanup
  if (opts.additionalTests) {
    opts.additionalTests(ctx);
  }

  it("removeItem", async () => {
    await ctx.storage.removeItem("s1:a", false);
    expect(await ctx.storage.hasItem("s1:a")).toBe(false);
    expect(await ctx.storage.getItem("s1:a")).toBe(undefined);
  });

  it("clear", async () => {
    await ctx.storage.clear();
    expect(await ctx.storage.getKeys()).toMatchObject([]);
    // ensure we can clear empty storage as well: #162
    await ctx.storage.clear();
    expect(await ctx.storage.getKeys()).toMatchObject([]);
  });

  it("dispose", async () => {
    await ctx.storage.dispose();
  });
}
