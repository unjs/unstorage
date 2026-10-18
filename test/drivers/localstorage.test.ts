import { describe, it, expect, vi } from "vitest";
import driver from "../../src/drivers/localstorage.ts";
import { testDriver } from "./utils.ts";
import { JSDOM } from "jsdom";

describe("drivers: localstorage", () => {
  const jsdom = new JSDOM("", {
    url: "http://localhost",
  });
  // jsdom.virtualConsole.sendTo(console);

  jsdom.window.localStorage.setItem("__external_key__", "unrelated_data");

  testDriver({
    driver: driver({
      window: jsdom.window as unknown as typeof window,
      base: "test",
    }),
    additionalTests: (ctx) => {
      it("check localstorage", async () => {
        await ctx.storage.setItem("s1:a", "test_data");
        expect(jsdom.window.localStorage.getItem("test:s1:a")).toBe("test_data");
        await ctx.driver.clear!("", {});
        expect(jsdom.window.localStorage.getItem("__external_key__")).toBe("unrelated_data");
      });
      it("watch localstorage", async () => {
        const watcher = vi.fn();
        await ctx.storage.watch(watcher);

        // Emulate
        // jsdom.window.localStorage.setItem('test:s1:random_file', 'random')
        const ev = jsdom.window.document.createEvent("CustomEvent");
        ev.initEvent("storage", true);
        // @ts-ignore
        ev.key = "test:s1:random_file";
        // @ts-ignore
        ev.newValue = "random";
        jsdom.window.dispatchEvent(ev);

        expect(watcher).toHaveBeenCalledWith("update", "s1:random_file");
      });
      it("watch ignores keys outside of base", async () => {
        const watcher = vi.fn();
        const unwatch = await ctx.storage.watch(watcher);

        // Emulate
        // jsdom.window.localStorage.setItem('other:random_file', 'random')
        const ev = jsdom.window.document.createEvent("CustomEvent");
        ev.initEvent("storage", true);
        // @ts-ignore
        ev.key = "other:random_file";
        // @ts-ignore
        ev.newValue = "random";
        jsdom.window.dispatchEvent(ev);

        await unwatch();
        expect(watcher).not.toHaveBeenCalled();
      });
      it("unwatch localstorage", async () => {
        const watcher = vi.fn();
        const unwatch = await ctx.storage.watch(watcher);

        // Emulate
        // jsdom.window.localStorage.setItem('test:s1:random_file', 'random')
        const ev = jsdom.window.document.createEvent("CustomEvent");
        ev.initEvent("storage", true);
        // @ts-ignore
        ev.key = "test:s1:random_file";
        // @ts-ignore
        ev.newValue = "random";
        const ev2 = jsdom.window.document.createEvent("CustomEvent");
        ev2.initEvent("storage", true);
        // @ts-ignore
        ev2.key = "test:s1:random_file2";
        // @ts-ignore
        ev2.newValue = "random";

        jsdom.window.dispatchEvent(ev);

        await unwatch();

        jsdom.window.dispatchEvent(ev2);

        expect(watcher).toHaveBeenCalledWith("update", "s1:random_file");
        expect(watcher).toHaveBeenCalledTimes(1);
      });
    },
  });
});
