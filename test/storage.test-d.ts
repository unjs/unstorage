import { describe, it, expectTypeOf } from "vitest";
import { createStorage, prefixStorage } from "../src";
import type { Storage, StorageValue } from "../src";

describe("types", () => {
  it("default types for storage", async () => {
    const storage = createStorage();

    expectTypeOf(
      await storage.getItem("foo")
    ).toEqualTypeOf<StorageValue | null>();

    expectTypeOf(await storage.getItem<boolean>("foo")).toEqualTypeOf<
      boolean | null
    >();

    expectTypeOf(
      await storage.getItem<{ hello: string }>("foo")
    ).toEqualTypeOf<{ hello: string } | null>();

    await storage.setItem("foo", "str");
    await storage.set("bar", 1);
    await storage.removeItem("foo");
    await storage.remove("bar");
    await storage.del("baz");
  });

  it("indexed types for storage", async () => {
    const storage = createStorage<string>();

    expectTypeOf(await storage.getItem("foo")).toEqualTypeOf<string | null>();

    await storage.setItem("foo", "str");
    // @ts-expect-error should be a string
    await storage.set("bar", 1);

    await storage.removeItem("foo");
    await storage.remove("bar");
    await storage.del("baz");
  });

  it("namespaced types for storage", async () => {
    type TestObjType = {
      a: number;
      b: boolean;
    };
    type MyStorage = {
      items: {
        foo: string;
        bar: number;
        baz: TestObjType;
      };
    };
    const storage = createStorage<MyStorage>();

    expectTypeOf(await storage.getItem("foo")).toEqualTypeOf<string | null>();
    expectTypeOf(await storage.getItem("bar")).toEqualTypeOf<number | null>();
    expectTypeOf(
      await storage.getItem("unknown")
    ).toEqualTypeOf<StorageValue | null>();
    expectTypeOf(await storage.get("baz")).toEqualTypeOf<TestObjType | null>();

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

  it("prefix storage", () => {
    const storage1 = createStorage();
    const prefixedStorage1 = prefixStorage(storage1, "foo");
    expectTypeOf(prefixedStorage1).toEqualTypeOf<Storage<StorageValue>>();

    const storage2 = createStorage<string>();
    const prefixedStorage2 = prefixStorage(storage2, "foo");
    expectTypeOf(prefixedStorage2).toEqualTypeOf<Storage<string>>();

    const storage3 = createStorage<string>();
    const prefixedStorage3 = prefixStorage<number>(storage3, "foo");
    expectTypeOf(prefixedStorage3).toEqualTypeOf<Storage<number>>();
  });
});
