import { describe, it, expect } from "vitest";
import { listen } from "listhen";
import { $fetch } from "ofetch";
import { createStorage } from "../src";
import { createStorageServer } from "../src/server";

describe("server", () => {
  it("basic", async () => {
    const storage = createStorage();
    const storageServer = createStorageServer(storage);
    const { close, url: serverURL } = await listen(storageServer.handle, {
      port: { random: true },
    });

    const fetchStorage = (url: string, options?: any) =>
      $fetch(url, { baseURL: serverURL, ...options });

    expect(await fetchStorage("foo/", {})).toMatchObject([]);

    await storage.setItem("foo/bar", "bar");
    await storage.setMeta("foo/bar", { mtime: new Date() });
    expect(await fetchStorage("foo/bar")).toBe("bar");

    expect(
      await fetchStorage("foo/bar", { method: "PUT", body: "updated" })
    ).toBe("OK");
    expect(await fetchStorage("foo/bar")).toBe("updated");
    expect(await fetchStorage("/")).toMatchObject(["foo/bar"]);

    expect(await fetchStorage("foo/bar", { method: "DELETE" })).toBe("OK");
    expect(await fetchStorage("foo/bar/", {})).toMatchObject([]);

    await close();
  });
});
