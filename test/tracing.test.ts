import { describe, it, expect, beforeEach, vi } from "vitest";
import { tracingChannel } from "node:diagnostics_channel";
import { createStorage } from "../src/storage.ts";
import { withTracing } from "../src/tracing.ts";
import type { Storage } from "../src/types.ts";
import memory from "../src/drivers/memory.ts";
import type { TracingOperation, UnstorageTracingData } from "../src/tracing.ts";

type TracingEvent = {
  start?: { data: UnstorageTracingData };
  end?: { data: UnstorageTracingData };
  asyncStart?: { data: UnstorageTracingData };
  asyncEnd?: { data: UnstorageTracingData; result?: any; error?: Error };
  error?: { data: UnstorageTracingData; error: Error };
};

function createTracingListener(operationName: TracingOperation) {
  const events: TracingEvent = {};

  // Create tracing channel
  const channel = tracingChannel(`unstorage.${operationName}`);

  // Create handlers
  const startHandler = vi.fn((message: any) => {
    events.start = { data: message };
  });

  const endHandler = vi.fn((message: any) => {
    events.end = { data: message };
  });

  const asyncStartHandler = vi.fn((message: any) => {
    events.asyncStart = { data: message };
  });

  const asyncEndHandler = vi.fn((message: any) => {
    events.asyncEnd = {
      data: message,
      result: message.result,
      error: message.error,
    };
  });

  const errorHandler = vi.fn((message: any) => {
    events.error = { data: message, error: message.error };
  });

  // Subscribe using the subscribe method which listens to all events
  channel.subscribe({
    start: startHandler,
    end: endHandler,
    asyncStart: asyncStartHandler,
    asyncEnd: asyncEndHandler,
    error: errorHandler,
  });

  return {
    events,
    handlers: {
      start: startHandler,
      end: endHandler,
      asyncStart: asyncStartHandler,
      asyncEnd: asyncEndHandler,
      error: errorHandler,
    },
    cleanup: () => {
      channel.unsubscribe({
        start: startHandler,
        end: endHandler,
        asyncStart: asyncStartHandler,
        asyncEnd: asyncEndHandler,
        error: errorHandler,
      });
    },
  };
}

describe("tracing", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = withTracing(createStorage({ driver: memory() }));
  });

  describe("opt-in behavior", () => {
    it("should not emit tracing events without withTracing wrapper", async () => {
      const plainStorage = createStorage({ driver: memory() });
      const listener = createTracingListener("getItem");

      await plainStorage.setItem("test:key", "value");
      await plainStorage.getItem("test:key");

      // No tracing events should be emitted
      expect(listener.handlers.start).not.toHaveBeenCalled();
      expect(listener.handlers.end).not.toHaveBeenCalled();
      expect(listener.handlers.asyncStart).not.toHaveBeenCalled();
      expect(listener.handlers.asyncEnd).not.toHaveBeenCalled();
      expect(listener.handlers.error).not.toHaveBeenCalled();

      listener.cleanup();
    });
  });

  describe("hasItem", () => {
    it("should emit correct tracing events on success", async () => {
      const listener = createTracingListener("hasItem");

      await storage.setItem("test:key", "value");
      const result = await storage.hasItem("test:key");

      expect(result).toBe(true);
      expect(listener.handlers.start).toHaveBeenCalledTimes(1);
      expect(listener.handlers.end).toHaveBeenCalledTimes(1);
      expect(listener.handlers.asyncStart).toHaveBeenCalledTimes(1);
      expect(listener.handlers.asyncEnd).toHaveBeenCalledTimes(1);
      expect(listener.handlers.error).not.toHaveBeenCalled();

      expect(listener.events.start?.data.keys).toEqual(["test:key"]);
      expect(listener.events.start?.data.base).toBe("");
      expect(listener.events.asyncEnd?.result).toBe(true);

      listener.cleanup();
    });

    it("should emit error event on failure", async () => {
      const listener = createTracingListener("hasItem");
      const errorDriver = memory();
      const testError = new Error("Test error");
      errorDriver.hasItem = () => {
        throw testError;
      };

      storage.mount("/error", errorDriver);

      await expect(storage.hasItem("error:key")).rejects.toThrow("Test error");

      expect(listener.handlers.start).toHaveBeenCalledTimes(1);
      expect(listener.handlers.asyncStart).toHaveBeenCalledTimes(1);
      expect(listener.handlers.error).toHaveBeenCalledTimes(1);
      expect(listener.events.error?.error).toBe(testError);

      listener.cleanup();
    });
  });

  describe("getItem", () => {
    it("should emit correct tracing events on success", async () => {
      const listener = createTracingListener("getItem");

      await storage.setItem("test:key", { foo: "bar" });
      const result = await storage.getItem("test:key");

      expect(result).toEqual({ foo: "bar" });
      expect(listener.handlers.start).toHaveBeenCalledTimes(1);
      expect(listener.handlers.end).toHaveBeenCalledTimes(1);
      expect(listener.handlers.asyncStart).toHaveBeenCalledTimes(1);
      expect(listener.handlers.asyncEnd).toHaveBeenCalledTimes(1);
      expect(listener.handlers.error).not.toHaveBeenCalled();

      expect(listener.events.start?.data.keys).toEqual(["test:key"]);
      expect(listener.events.asyncEnd?.result).toEqual({ foo: "bar" });

      listener.cleanup();
    });

    it("should emit error event on failure", async () => {
      const listener = createTracingListener("getItem");
      const errorDriver = memory();
      const testError = new Error("Get error");
      errorDriver.getItem = () => {
        throw testError;
      };

      storage.mount("/error", errorDriver);

      await expect(storage.getItem("error:key")).rejects.toThrow("Get error");

      expect(listener.handlers.error).toHaveBeenCalledTimes(1);
      expect(listener.events.error?.error).toBe(testError);

      listener.cleanup();
    });
  });

  describe("setItem", () => {
    it("should emit correct tracing events on success", async () => {
      const listener = createTracingListener("setItem");

      await storage.setItem("test:key", "value");

      expect(listener.handlers.start).toHaveBeenCalledTimes(1);
      expect(listener.handlers.end).toHaveBeenCalledTimes(1);
      expect(listener.handlers.asyncStart).toHaveBeenCalledTimes(1);
      expect(listener.handlers.asyncEnd).toHaveBeenCalledTimes(1);
      expect(listener.handlers.error).not.toHaveBeenCalled();

      expect(listener.events.start?.data.keys).toEqual(["test:key"]);

      listener.cleanup();
    });

    it("should emit error event on failure", async () => {
      const listener = createTracingListener("setItem");
      const errorDriver = memory();
      const testError = new Error("Set error");
      errorDriver.setItem = () => {
        throw testError;
      };

      storage.mount("/error", errorDriver);

      await expect(storage.setItem("error:key", "value")).rejects.toThrow(
        "Set error"
      );

      expect(listener.handlers.error).toHaveBeenCalledTimes(1);
      expect(listener.events.error?.error).toBe(testError);

      listener.cleanup();
    });
  });

  describe("setItems", () => {
    it("should emit correct tracing events on success", async () => {
      const listener = createTracingListener("setItems");

      await storage.setItems([
        { key: "test:key1", value: "value1" },
        { key: "test:key2", value: "value2" },
      ]);

      expect(listener.handlers.start).toHaveBeenCalledTimes(1);
      expect(listener.handlers.end).toHaveBeenCalledTimes(1);
      expect(listener.handlers.asyncStart).toHaveBeenCalledTimes(1);
      expect(listener.handlers.asyncEnd).toHaveBeenCalledTimes(1);
      expect(listener.handlers.error).not.toHaveBeenCalled();

      expect(listener.events.start?.data.keys).toEqual([
        "test:key1",
        "test:key2",
      ]);

      listener.cleanup();
    });

    it("should emit error event on failure", async () => {
      const listener = createTracingListener("setItems");
      const errorDriver = memory();
      const testError = new Error("SetItems error");
      errorDriver.setItem = () => {
        throw testError;
      };

      storage.mount("/error", errorDriver);

      await expect(
        storage.setItems([
          { key: "error:key1", value: "value1" },
          { key: "error:key2", value: "value2" },
        ])
      ).rejects.toThrow("SetItems error");

      expect(listener.handlers.error).toHaveBeenCalledTimes(1);
      expect(listener.events.error?.error).toBe(testError);

      listener.cleanup();
    });
  });

  describe("removeItem", () => {
    it("should emit correct tracing events on success", async () => {
      const listener = createTracingListener("removeItem");

      await storage.setItem("test:key", "value");
      await storage.removeItem("test:key");

      expect(listener.handlers.start).toHaveBeenCalledTimes(1);
      expect(listener.handlers.end).toHaveBeenCalledTimes(1);
      expect(listener.handlers.asyncStart).toHaveBeenCalledTimes(1);
      expect(listener.handlers.asyncEnd).toHaveBeenCalledTimes(1);
      expect(listener.handlers.error).not.toHaveBeenCalled();

      expect(listener.events.start?.data.keys).toEqual(["test:key"]);

      listener.cleanup();
    });

    it("should emit error event on failure", async () => {
      const listener = createTracingListener("removeItem");
      const errorDriver = memory();
      const testError = new Error("Remove error");
      errorDriver.removeItem = () => {
        throw testError;
      };

      storage.mount("/error", errorDriver);

      await expect(storage.removeItem("error:key")).rejects.toThrow(
        "Remove error"
      );

      expect(listener.handlers.error).toHaveBeenCalledTimes(1);
      expect(listener.events.error?.error).toBe(testError);

      listener.cleanup();
    });
  });

  describe("getKeys", () => {
    it("should emit correct tracing events on success", async () => {
      const listener = createTracingListener("getKeys");

      await storage.setItem("test:key1", "value1");
      await storage.setItem("test:key2", "value2");
      const result = await storage.getKeys("test");

      expect(result).toEqual(["test:key1", "test:key2"]);
      expect(listener.handlers.start).toHaveBeenCalledTimes(1);
      expect(listener.handlers.end).toHaveBeenCalledTimes(1);
      expect(listener.handlers.asyncStart).toHaveBeenCalledTimes(1);
      expect(listener.handlers.asyncEnd).toHaveBeenCalledTimes(1);
      expect(listener.handlers.error).not.toHaveBeenCalled();

      expect(listener.events.start?.data.keys).toEqual(["test:"]);
      expect(listener.events.asyncEnd?.result).toEqual([
        "test:key1",
        "test:key2",
      ]);

      listener.cleanup();
    });

    it("should emit error event on failure", async () => {
      const listener = createTracingListener("getKeys");
      const errorDriver = memory();
      const testError = new Error("GetKeys error");
      errorDriver.getKeys = () => {
        throw testError;
      };

      storage.mount("/error", errorDriver);

      await expect(storage.getKeys("error")).rejects.toThrow("GetKeys error");

      expect(listener.handlers.error).toHaveBeenCalledTimes(1);
      expect(listener.events.error?.error).toBe(testError);

      listener.cleanup();
    });
  });

  describe("getItems", () => {
    it("should emit correct tracing events on success", async () => {
      const listener = createTracingListener("getItems");

      await storage.setItem("test:key1", "value1");
      await storage.setItem("test:key2", "value2");
      const result = await storage.getItems(["test:key1", "test:key2"]);

      expect(result).toEqual([
        { key: "test:key1", value: "value1" },
        { key: "test:key2", value: "value2" },
      ]);
      expect(listener.handlers.start).toHaveBeenCalledTimes(1);
      expect(listener.handlers.end).toHaveBeenCalledTimes(1);
      expect(listener.handlers.asyncStart).toHaveBeenCalledTimes(1);
      expect(listener.handlers.asyncEnd).toHaveBeenCalledTimes(1);
      expect(listener.handlers.error).not.toHaveBeenCalled();

      expect(listener.events.start?.data.keys).toEqual([
        "test:key1",
        "test:key2",
      ]);
      expect(listener.events.asyncEnd?.result).toEqual([
        { key: "test:key1", value: "value1" },
        { key: "test:key2", value: "value2" },
      ]);

      listener.cleanup();
    });

    it("should emit error event on failure", async () => {
      const listener = createTracingListener("getItems");
      const errorDriver = memory();
      const testError = new Error("GetItems error");
      errorDriver.getItem = () => {
        throw testError;
      };

      storage.mount("/error", errorDriver);

      await expect(
        storage.getItems(["error:key1", "error:key2"])
      ).rejects.toThrow("GetItems error");

      expect(listener.handlers.error).toHaveBeenCalledTimes(1);
      expect(listener.events.error?.error).toBe(testError);

      listener.cleanup();
    });
  });

  describe("getItemRaw", () => {
    it("should emit correct tracing events on success", async () => {
      const listener = createTracingListener("getItemRaw");

      await storage.setItemRaw("test:key", Buffer.from("raw value"));
      const result = await storage.getItemRaw("test:key");

      expect(result).toBeInstanceOf(Buffer);
      expect(listener.handlers.start).toHaveBeenCalledTimes(1);
      expect(listener.handlers.end).toHaveBeenCalledTimes(1);
      expect(listener.handlers.asyncStart).toHaveBeenCalledTimes(1);
      expect(listener.handlers.asyncEnd).toHaveBeenCalledTimes(1);
      expect(listener.handlers.error).not.toHaveBeenCalled();

      expect(listener.events.start?.data.keys).toEqual(["test:key"]);

      listener.cleanup();
    });

    it("should emit error event on failure", async () => {
      const listener = createTracingListener("getItemRaw");
      const errorDriver = memory();
      const testError = new Error("GetItemRaw error");
      // getItemRaw falls back to getItem, so we need to make that throw
      errorDriver.getItem = () => {
        throw testError;
      };
      // Also make sure getItemRaw is undefined so it uses the fallback
      errorDriver.getItemRaw = undefined;

      storage.mount("/error", errorDriver);

      await expect(storage.getItemRaw("error:key")).rejects.toThrow(
        "GetItemRaw error"
      );

      expect(listener.handlers.error).toHaveBeenCalledTimes(1);
      expect(listener.events.error?.error).toBe(testError);

      listener.cleanup();
    });
  });

  describe("setItemRaw", () => {
    it("should emit correct tracing events on success", async () => {
      const listener = createTracingListener("setItemRaw");

      await storage.setItemRaw("test:key", Buffer.from("raw value"));

      expect(listener.handlers.start).toHaveBeenCalledTimes(1);
      expect(listener.handlers.end).toHaveBeenCalledTimes(1);
      expect(listener.handlers.asyncStart).toHaveBeenCalledTimes(1);
      expect(listener.handlers.asyncEnd).toHaveBeenCalledTimes(1);
      expect(listener.handlers.error).not.toHaveBeenCalled();

      expect(listener.events.start?.data.keys).toEqual(["test:key"]);

      listener.cleanup();
    });

    it("should emit error event on failure", async () => {
      const listener = createTracingListener("setItemRaw");
      const errorDriver = memory();
      const testError = new Error("SetItemRaw error");
      // setItemRaw falls back to setItem, so we need to make that throw
      errorDriver.setItem = () => {
        throw testError;
      };
      // Also make sure setItemRaw is undefined so it uses the fallback
      errorDriver.setItemRaw = undefined;

      storage.mount("/error", errorDriver);

      await expect(
        storage.setItemRaw("error:key", Buffer.from("value"))
      ).rejects.toThrow("SetItemRaw error");

      expect(listener.handlers.error).toHaveBeenCalledTimes(1);
      expect(listener.events.error?.error).toBe(testError);

      listener.cleanup();
    });
  });

  describe("clear", () => {
    it("should emit correct tracing events on success", async () => {
      const listener = createTracingListener("clear");

      await storage.setItem("test:key1", "value1");
      await storage.setItem("test:key2", "value2");
      await storage.clear("test");

      expect(listener.handlers.start).toHaveBeenCalledTimes(1);
      expect(listener.handlers.end).toHaveBeenCalledTimes(1);
      expect(listener.handlers.asyncStart).toHaveBeenCalledTimes(1);
      expect(listener.handlers.asyncEnd).toHaveBeenCalledTimes(1);
      expect(listener.handlers.error).not.toHaveBeenCalled();

      expect(listener.events.start?.data.keys).toEqual(["test:"]);

      listener.cleanup();
    });

    it("should emit error event on failure", async () => {
      const listener = createTracingListener("clear");
      const errorDriver = memory();
      const testError = new Error("Clear error");
      errorDriver.clear = () => {
        throw testError;
      };

      storage.mount("/error", errorDriver);

      await expect(storage.clear("error")).rejects.toThrow("Clear error");

      expect(listener.handlers.error).toHaveBeenCalledTimes(1);
      expect(listener.events.error?.error).toBe(testError);

      listener.cleanup();
    });
  });

  describe("getMeta", () => {
    it("should emit correct tracing events with meta flag on success", async () => {
      const listener = createTracingListener("getItem");

      await storage.setMeta("test:key", { mtime: new Date(), custom: "data" });
      const result = await storage.getMeta("test:key");

      expect(result).toBeDefined();
      expect(listener.handlers.start).toHaveBeenCalled();
      expect(listener.handlers.end).toHaveBeenCalled();
      expect(listener.handlers.asyncStart).toHaveBeenCalled();
      expect(listener.handlers.asyncEnd).toHaveBeenCalled();
      expect(listener.handlers.error).not.toHaveBeenCalled();

      // Verify meta flag is set to true
      expect(listener.events.start?.data.keys).toEqual(["test:key"]);
      expect(listener.events.start?.data.meta).toBe(true);
      expect(listener.events.asyncEnd?.result).toBeDefined();

      listener.cleanup();
    });

    it("should emit error event with meta flag on failure", async () => {
      const listener = createTracingListener("getItem");
      const errorDriver = memory();
      const testError = new Error("GetMeta error");
      // getMeta falls back to getItem for metadata, so we need to make that throw
      errorDriver.getItem = () => {
        throw testError;
      };
      errorDriver.getMeta = undefined;

      storage.mount("/error", errorDriver);

      await expect(storage.getMeta("error:key")).rejects.toThrow(
        "GetMeta error"
      );

      expect(listener.handlers.error).toHaveBeenCalled();
      expect(listener.events.error?.error).toBe(testError);
      // Verify meta flag is set to true in error event
      expect(listener.events.error?.data.meta).toBe(true);

      listener.cleanup();
    });
  });

  describe("setMeta", () => {
    it("should emit setItem tracing events with meta flag on success", async () => {
      const listener = createTracingListener("setItem");

      await storage.setMeta("test:key", { mtime: new Date(), custom: "data" });

      expect(listener.handlers.start).toHaveBeenCalled();
      expect(listener.handlers.end).toHaveBeenCalled();
      expect(listener.handlers.asyncStart).toHaveBeenCalled();
      expect(listener.handlers.asyncEnd).toHaveBeenCalled();
      expect(listener.handlers.error).not.toHaveBeenCalled();

      // Verify meta flag is set to true and key has $ suffix
      expect(listener.events.start?.data.keys).toEqual(["test:key$"]);
      expect(listener.events.start?.data.meta).toBe(true);

      listener.cleanup();
    });

    it("should emit error event with meta flag on failure", async () => {
      const listener = createTracingListener("setItem");
      const errorDriver = memory();
      const testError = new Error("SetMeta error");
      errorDriver.setItem = () => {
        throw testError;
      };

      storage.mount("/error", errorDriver);

      await expect(
        storage.setMeta("error:key", { custom: "data" })
      ).rejects.toThrow("SetMeta error");

      expect(listener.handlers.error).toHaveBeenCalled();
      expect(listener.events.error?.error).toBe(testError);
      // Verify meta flag is set to true in error event
      expect(listener.events.error?.data.meta).toBe(true);
      expect(listener.events.error?.data.keys).toEqual(["error:key$"]);

      listener.cleanup();
    });
  });

  describe("removeMeta", () => {
    it("should emit removeItem tracing events with meta flag on success", async () => {
      const listener = createTracingListener("removeItem");

      await storage.setMeta("test:key", { custom: "data" });
      await storage.removeMeta("test:key");

      expect(listener.handlers.start).toHaveBeenCalled();
      expect(listener.handlers.end).toHaveBeenCalled();
      expect(listener.handlers.asyncStart).toHaveBeenCalled();
      expect(listener.handlers.asyncEnd).toHaveBeenCalled();
      expect(listener.handlers.error).not.toHaveBeenCalled();

      // Verify meta flag is set to true and key has $ suffix
      expect(listener.events.start?.data.keys).toEqual(["test:key$"]);
      expect(listener.events.start?.data.meta).toBe(true);

      listener.cleanup();
    });

    it("should emit error event with meta flag on failure", async () => {
      const listener = createTracingListener("removeItem");
      const errorDriver = memory();
      const testError = new Error("RemoveMeta error");
      errorDriver.removeItem = () => {
        throw testError;
      };

      storage.mount("/error", errorDriver);

      await expect(storage.removeMeta("error:key")).rejects.toThrow(
        "RemoveMeta error"
      );

      expect(listener.handlers.error).toHaveBeenCalled();
      expect(listener.events.error?.error).toBe(testError);
      // Verify meta flag is set to true in error event
      expect(listener.events.error?.data.meta).toBe(true);
      expect(listener.events.error?.data.keys).toEqual(["error:key$"]);

      listener.cleanup();
    });
  });

  describe("base mount tracking", () => {
    it("should include correct base for different mount points", async () => {
      const listener = createTracingListener("getItem");

      // Create storage with multiple mounts
      const baseStorage = withTracing(createStorage({ driver: memory() }));
      baseStorage.mount("/cache", memory());
      baseStorage.mount("/db", memory());
      const multiStorage = baseStorage;

      // Set items in different mounts
      await multiStorage.setItem("root:key", "root value");
      await multiStorage.setItem("cache:key", "cache value");
      await multiStorage.setItem("db:key", "db value");

      // Test root mount
      await multiStorage.getItem("root:key");
      expect(listener.events.start?.data.base).toBe("");

      // Test cache mount
      await multiStorage.getItem("cache:key");
      expect(listener.events.start?.data.base).toBe("cache:");

      // Test db mount
      await multiStorage.getItem("db:key");
      expect(listener.events.start?.data.base).toBe("db:");

      listener.cleanup();
    });
  });

  describe("driver information tracking", () => {
    it("should include driver name in tracing context", async () => {
      const listener = createTracingListener("getItem");

      await storage.setItem("test:key", "value");
      await storage.getItem("test:key");

      expect(listener.events.start?.data.driver).toBeDefined();
      expect(listener.events.start?.data.driver?.name).toBe("memory");

      listener.cleanup();
    });
  });
});
