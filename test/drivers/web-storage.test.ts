import { describe, it, expect, vi } from "vitest";
import driver from "../../src/drivers/web-storage";
import { testDriver } from "./utils";
import { JSDOM } from "jsdom";

describe("drivers: web-storage", () => {
  const jsdom = new JSDOM("", {
    url: "http://localhost",
  });
  jsdom.virtualConsole.sendTo(console);

  testDriver({
    driver: driver({ window: jsdom.window as unknown as typeof window, storageArea: jsdom.window.localStorage}),
    additionalTests: (ctx) => {
      it("check localstorage", () => {
        expect(jsdom.window.localStorage.getItem("s1:a")).toBe("test_data");
      });
      it("watch localstorage", async () => {
        const watcher = vi.fn();
        await ctx.storage.watch(watcher);

        // Emulate
        // jsdom.window.localStorage.setItem('s1:random_file', 'random')
        const ev = jsdom.window.document.createEvent("CustomEvent");
        ev.initEvent("storage", true);
        // @ts-ignore
        ev.key = "s1:random_file";
        // @ts-ignore
        ev.newValue = "random";
        // @ts-ignore
        ev.storageArea = jsdom.window.localStorage;
        jsdom.window.dispatchEvent(ev);

        expect(watcher).toHaveBeenCalledWith("update", "s1:random_file");
      });
      it("unwatch localstorage", async () => {
        const watcher = vi.fn();
        const unwatch = await ctx.storage.watch(watcher);

        // Emulate
        // jsdom.window.localStorage.setItem('s1:random_file', 'random')
        const ev = jsdom.window.document.createEvent("CustomEvent");
        ev.initEvent("storage", true);
        // @ts-ignore
        ev.key = "s1:random_file";
        // @ts-ignore
        ev.newValue = "random";
        // @ts-ignore
        ev.storageArea = jsdom.window.localStorage;

        const ev2 = jsdom.window.document.createEvent("CustomEvent");
        ev2.initEvent("storage", true);
        // @ts-ignore
        ev2.key = "s1:random_file2";
        // @ts-ignore
        ev2.newValue = "random";
        // @ts-ignore
        ev.storageArea = jsdom.window.localStorage;

        jsdom.window.dispatchEvent(ev);

        await unwatch();

        jsdom.window.dispatchEvent(ev2);

        expect(watcher).toHaveBeenCalledWith("update", "s1:random_file");
        expect(watcher).toHaveBeenCalledTimes(1);
      });
    },
  });
});
