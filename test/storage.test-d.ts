import { describe, it, expectTypeOf } from "vitest";
import { createStorage } from "../src";
import type { StorageValue } from "../src";

describe("types", () => {
  it("check types", async () => {
    type TestObjType = {
      a: number;
      b: boolean;
    };
    type MyStorage = {
      data: {
        foo: string;
        bar: number;
        baz: TestObjType;
      };
    };
    const storage = createStorage<MyStorage>();

    expectTypeOf(await storage.getItem("foo")).toMatchTypeOf<string | null>();
    expectTypeOf(await storage.getItem("bar")).toMatchTypeOf<number | null>();
    expectTypeOf(await storage.getItem("unknown")).toMatchTypeOf<StorageValue | null>();
    expectTypeOf(await storage.get("baz")).toMatchTypeOf<TestObjType | null>();
    expectTypeOf(
      await storage.getItem("aaaaa")
    ).toMatchTypeOf<MyStorage | null>();

    // @ts-expect-error
    await storage.setItem("foo", 1); // ts err: Argument of type 'number' is not assignable to parameter of type 'string'
    await storage.setItem("foo", "str");
    // @ts-expect-error
    await storage.set("bar", "str"); // ts err: Argument of type 'string' is not assignable to parameter of type 'number'.
    await storage.set("bar", 1);

    // should be able to get ts prompts: 'foo' | 'bar' | 'baz'
    await storage.removeItem("foo");
    await storage.remove("bar");
    await storage.del("baz");
  });
});
