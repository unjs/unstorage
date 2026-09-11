import { describe, expect, it } from "vitest";
import { createStorage } from "../src/index.ts";
import overlayDriver from "../src/drivers/overlay.ts";

describe("dispose", () => {
  it("uses driver.dispose or Symbol.asyncDispose when available", async () => {
    const calls: string[] = [];
    const storage = createStorage({
      driver: {
        label: "root",
        hasItem: () => false,
        getItem: () => null,
        getKeys: () => [],
        dispose() {
          calls.push(this.label);
        },
      },
    });

    await storage.dispose();

    expect(calls).toEqual(["root"]);
  });

  it("cleans up overlay layers with either dispose or Symbol.asyncDispose", async () => {
    const calls: string[] = [];
    const storage = createStorage({
      driver: overlayDriver({
        layers: [
          {
            name: "async",
            hasItem: () => false,
            getItem: () => null,
            getKeys: () => [],
            [Symbol.asyncDispose]() {
              calls.push(this.name);
            },
          },
          {
            name: "sync",
            hasItem: () => false,
            getItem: () => null,
            getKeys: () => [],
            dispose() {
              calls.push(this.name);
            },
          },
        ],
      }),
    });

    await storage.dispose();

    expect(calls).toEqual(expect.arrayContaining(["async", "sync"]));
  });
});
