import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import driver from "../../src/drivers/query-string";
import { testDriver } from "./utils";

describe("drivers: query-string", () => {
  let mockLocation: {
    search: string;
    pathname: string;
    hash: string;
    href: string;
    origin: string;
  };

  let mockWindow: {
    location: typeof mockLocation;
    history: {
      pushState: ReturnType<typeof vi.fn>;
      replaceState: ReturnType<typeof vi.fn>;
    };
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockLocation = {
      search: "",
      pathname: "/test",
      hash: "",
      href: "http://localhost/test",
      origin: "http://localhost",
    };

    mockWindow = {
      location: mockLocation,
      history: {
        pushState: vi.fn(),
        replaceState: vi.fn(),
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("basic operations", () => {
    it("should set and get simple values", async () => {
      const storage = driver({ window: mockWindow as any, url: mockLocation });

      await storage.setItem("key1", "value1");
      expect(mockWindow.history.replaceState).toHaveBeenCalledWith(
        null,
        "",
        "/test?key1=value1"
      );

      mockLocation.search = "?key1=value1";
      expect(await storage.getItem("key1")).toBe("value1");
    });

    it("should handle different value types", async () => {
      const storage = driver({ window: mockWindow as any, url: mockLocation });

      await storage.setItem("string", "hello");
      mockLocation.search = "?string=hello";
      expect(await storage.getItem("string")).toBe("hello");

      await storage.setItem("number", 42);
      mockLocation.search = "?string=hello&number=42";
      expect(await storage.getItem("number")).toBe(42);

      await storage.setItem("boolean", true);
      mockLocation.search = "?string=hello&number=42&boolean=true";
      expect(await storage.getItem("boolean")).toBe(true);

      await storage.setItem("object", { foo: "bar" });
      mockLocation.search =
        "?string=hello&number=42&boolean=true&object=%7B%22foo%22%3A%22bar%22%7D";
      expect(await storage.getItem("object")).toEqual({ foo: "bar" });
    });

    it("should check if item exists", async () => {
      const storage = driver({ window: mockWindow as any, url: mockLocation });

      expect(await storage.hasItem("key1")).toBe(false);

      mockLocation.search = "?key1=value1";
      expect(await storage.hasItem("key1")).toBe(true);
    });

    it("should remove items", async () => {
      const storage = driver({ window: mockWindow as any, url: mockLocation });
      mockLocation.search = "?key1=value1&key2=value2";

      await storage.removeItem("key1");
      expect(mockWindow.history.replaceState).toHaveBeenCalledWith(
        null,
        "",
        "/test?key2=value2"
      );

      mockLocation.search = "?key2=value2";
      expect(await storage.hasItem("key1")).toBe(false);
      expect(await storage.hasItem("key2")).toBe(true);
    });

    it("should get all keys", async () => {
      const storage = driver({ window: mockWindow as any, url: mockLocation });
      mockLocation.search = "?key1=value1&key2=value2&key3=value3";

      const keys = await storage.getKeys();
      expect(keys).toEqual(["key1", "key2", "key3"]);
    });

    it("should clear all items", async () => {
      const storage = driver({ window: mockWindow as any, url: mockLocation });
      mockLocation.search = "?key1=value1&key2=value2";

      await storage.clear();
      expect(mockWindow.history.replaceState).toHaveBeenCalledWith(
        null,
        "",
        "/test"
      );

      mockLocation.search = "";
      expect(await storage.getKeys()).toEqual([]);
    });
  });

  describe("with base prefix", () => {
    it("should use base prefix for all operations", async () => {
      const storage = driver({
        window: mockWindow as any,
        url: mockLocation,
        base: "app",
      });

      await storage.setItem("key1", "value1");
      expect(mockWindow.history.replaceState).toHaveBeenCalledWith(
        null,
        "",
        "/test?app_key1=value1"
      );

      mockLocation.search = "?app_key1=value1&other_key=other_value";
      expect(await storage.getItem("key1")).toBe("value1");
      expect(await storage.hasItem("key1")).toBe(true);

      const keys = await storage.getKeys();
      expect(keys).toEqual(["key1"]);
    });

    it("should only clear items with base prefix", async () => {
      const storage = driver({
        window: mockWindow as any,
        url: mockLocation,
        base: "app",
      });

      mockLocation.search =
        "?app_key1=value1&app_key2=value2&other_key=other_value";

      await storage.clear();
      expect(mockWindow.history.replaceState).toHaveBeenCalledWith(
        null,
        "",
        "/test?other_key=other_value"
      );
    });

    it("should clear with additional prefix", async () => {
      const storage = driver({
        window: mockWindow as any,
        url: mockLocation,
        base: "app",
      });

      mockLocation.search = "?app_user_1=a&app_user_2=b&app_system_1=c";

      await storage.clear("user");
      expect(mockWindow.history.replaceState).toHaveBeenCalledWith(
        null,
        "",
        "/test?app_system_1=c"
      );
    });
  });

  describe("history methods", () => {
    it("should use pushState when configured", async () => {
      const storage = driver({
        window: mockWindow as any,
        url: mockLocation,
        historyMethod: "pushState",
      });

      await storage.setItem("key1", "value1");
      expect(mockWindow.history.pushState).toHaveBeenCalledWith(
        null,
        "",
        "/test?key1=value1"
      );
      expect(mockWindow.history.replaceState).not.toHaveBeenCalled();
    });

    it("should not update history when disabled", async () => {
      const storage = driver({
        window: mockWindow as any,
        url: mockLocation,
        updateHistory: false,
      });

      await storage.setItem("key1", "value1");
      expect(mockWindow.history.pushState).not.toHaveBeenCalled();
      expect(mockWindow.history.replaceState).not.toHaveBeenCalled();
    });
  });

  describe("URL object support", () => {
    it("should work with URL object", async () => {
      const url = new URL("http://localhost/test");
      const storage = driver({ url });

      await storage.setItem("key1", "value1");
      expect(url.search).toBe("?key1=value1");

      expect(await storage.getItem("key1")).toBe("value1");
      expect(await storage.hasItem("key1")).toBe(true);
    });
  });

  describe("watch functionality", () => {
    it("should watch for changes", async () => {
      const storage = driver({
        window: mockWindow as any,
        url: mockLocation,
      });

      const callback = vi.fn();
      const unwatch = await storage.watch?.(callback);

      expect(mockWindow.addEventListener).toHaveBeenCalledWith(
        "popstate",
        expect.any(Function)
      );

      const popstateHandler = mockWindow.addEventListener.mock.calls[0][1];

      mockLocation.search = "?key1=newValue";
      popstateHandler();

      expect(callback).toHaveBeenCalledWith("update", "key1");

      await unwatch?.();
      expect(mockWindow.removeEventListener).toHaveBeenCalledWith(
        "popstate",
        popstateHandler
      );
    });
  });

  describe("URL length warning", () => {
    it("should warn when URL exceeds max length", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const storage = driver({
        window: mockWindow as any,
        url: mockLocation,
        maxUrlLength: 50,
      });

      await storage.setItem("key", "a".repeat(100));

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("URL length")
      );

      consoleSpy.mockRestore();
    });

    it("should not warn when maxUrlLength is 0", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const storage = driver({
        window: mockWindow as any,
        url: mockLocation,
        maxUrlLength: 0,
      });

      await storage.setItem("key", "a".repeat(100));

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("edge cases", () => {
    it("should handle empty values", async () => {
      const storage = driver({ window: mockWindow as any, url: mockLocation });

      await storage.setItem("empty", "");
      mockLocation.search = "?empty=";
      expect(await storage.getItem("empty")).toBe("");

      await storage.setItem("null", null as any);
      mockLocation.search = "?empty=&null=";
      expect(await storage.getItem("null")).toBe("");
    });

    it("should handle special characters in keys", async () => {
      const storage = driver({ window: mockWindow as any, url: mockLocation });

      await storage.setItem("key:with:colons", "value");
      expect(mockWindow.history.replaceState).toHaveBeenCalledWith(
        null,
        "",
        "/test?key%3Awith%3Acolons=value"
      );

      mockLocation.search = "?key%3Awith%3Acolons=value";
      expect(await storage.getItem("key:with:colons")).toBe("value");
    });

    it("should handle URL encoding in values", async () => {
      const storage = driver({ window: mockWindow as any, url: mockLocation });

      const complexValue = { text: "hello world & special=chars?#" };
      await storage.setItem("complex", complexValue);

      // URLSearchParams encodes the value
      expect(mockWindow.history.replaceState).toHaveBeenCalledWith(
        null,
        "",
        expect.stringContaining("complex=")
      );
    });
  });

  describe("SSR compatibility", () => {
    it("should work without window object", async () => {
      const url = new URL("http://localhost/test");
      const storage = driver({ url });

      await storage.setItem("key1", "value1");
      expect(url.search).toBe("?key1=value1");

      await storage.removeItem("key1");
      expect(url.search).toBe("");

      expect(await storage.watch?.(vi.fn())).toBeDefined();
    });

    it("should handle missing url and window gracefully", async () => {
      const storage = driver({});

      expect(await storage.hasItem("key")).toBe(false);
      expect(await storage.getItem("key")).toBe(null);
      expect(await storage.getKeys()).toEqual([]);
    });
  });
});

describe("drivers: query-string (integration)", () => {
  testDriver({
    driver: () =>
      driver({
        url: new URL("http://localhost/test"),
      }),
    additionalTests: (ctx) => {
      it("should handle concurrent operations", async () => {
        const promises = [];
        for (let i = 0; i < 10; i++) {
          promises.push(ctx.storage.setItem(`key${i}`, `value${i}`));
        }
        await Promise.all(promises);

        const keys = await ctx.storage.getKeys();
        expect(keys).toHaveLength(10);

        for (let i = 0; i < 10; i++) {
          expect(await ctx.storage.getItem(`key${i}`)).toBe(`value${i}`);
        }
      });
    },
  });
});
