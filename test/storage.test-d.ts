import { describe, it, expectTypeOf } from "vitest";
import { createStorage, prefixStorage } from "../src/index.ts";
import type { JSONValue, Storage, StorageValue } from "../src/index.ts";

describe("types", () => {
  it("default types for storage", async () => {
    const storage = createStorage();

    expectTypeOf(await storage.getItem("foo")).toEqualTypeOf<StorageValue | null>();

    expectTypeOf(await storage.getItem<boolean>("foo")).toEqualTypeOf<boolean | null>();

    expectTypeOf(await storage.getItem<{ hello: string }>("foo")).toEqualTypeOf<{
      hello: string;
    } | null>();

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
    expectTypeOf(await storage.getItem("unknown")).toEqualTypeOf<StorageValue | null>();
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

  it("typed getItem", async () => {
    const storage = createStorage();

    expectTypeOf(await storage.getItem("foo", { type: "text" })).toEqualTypeOf<string | null>();
    expectTypeOf(await storage.getItem("foo", { type: "json" })).toEqualTypeOf<JSONValue | null>();
    expectTypeOf(
      await storage.getItem("foo", { type: "bytes" }),
    ).toEqualTypeOf<Uint8Array | null>();
    expectTypeOf(await storage.getItem("foo", { type: "blob" })).toEqualTypeOf<Blob | null>();
    expectTypeOf(
      await storage.getItem("foo", { type: "stream" }),
    ).toEqualTypeOf<ReadableStream<Uint8Array> | null>();
    expectTypeOf(await storage.get("foo", { type: "bytes" })).toEqualTypeOf<Uint8Array | null>();
  });

  it("typed getItems", async () => {
    const storage = createStorage();

    expectTypeOf(await storage.getItems(["foo"], { type: "text" })).toEqualTypeOf<
      { key: string; value: string | null }[]
    >();
    expectTypeOf(await storage.getItems(["foo"], { type: "bytes" })).toEqualTypeOf<
      { key: string; value: Uint8Array | null }[]
    >();
    expectTypeOf(await storage.getItems(["foo"])).toEqualTypeOf<
      { key: string; value: StorageValue }[]
    >();

    // Per item `type` narrows the value type too
    expectTypeOf(
      await storage.getItems([{ key: "foo", options: { type: "bytes" } }]),
    ).toEqualTypeOf<{ key: string; value: Uint8Array | null }[]>();

    // Mixed items widen to the union of what was requested
    expectTypeOf(
      await storage.getItems([
        { key: "foo", options: { type: "json" } },
        { key: "bar", options: { type: "bytes" } },
      ]),
    ).toEqualTypeOf<{ key: string; value: JSONValue | Uint8Array | null }[]>();

    // Items without a `type` fall back to the common options
    expectTypeOf(
      await storage.getItems(["foo", { key: "bar", options: { type: "bytes" } }], {
        type: "text",
      }),
    ).toEqualTypeOf<{ key: string; value: string | Uint8Array | null }[]>();

    // ...and to the storage value type when there are none
    expectTypeOf(
      await storage.getItems(["foo", { key: "bar", options: { ttl: 60 } }]),
    ).toEqualTypeOf<{ key: string; value: StorageValue }[]>();

    // A non literal list keeps the default value type
    const keys: string[] = ["foo", "bar"];
    expectTypeOf(await storage.getItems(keys, { type: "blob" })).toEqualTypeOf<
      { key: string; value: Blob | null }[]
    >();
  });

  it("rejects invalid getItem inputs", async () => {
    const storage = createStorage();

    // @ts-expect-error keys have to be strings
    await storage.getItem(123);

    // @ts-expect-error `type` has to be a known conversion type
    await storage.getItem("foo", { type: "buffer" });

    // @ts-expect-error `type` has to be a known conversion type, per item too
    await storage.getItems([{ key: "foo", options: { type: "buffer" } }]);
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
