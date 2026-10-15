import { createServer, type AddressInfo, type Socket } from "node:net";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import * as redis from "redis";
import { createClient, RESP_TYPES, type RedisClientType } from "redis";
import nodeRedisDriver from "../../src/drivers/node-redis.ts";
import { testDriver } from "./utils.ts";

// Requires a running redis server, e.g. `VITE_REDIS_URL=redis://localhost:6379/0`
const url = process.env.VITE_REDIS_URL;

describe.skipIf(!url)("drivers: node-redis", () => {
  const base = `test-${Math.round(Math.random() * 1_000_000).toString(16)}`;

  const withClient = async <T>(fn: (client: RedisClientType) => Promise<T>) => {
    const client = createClient({ url });
    await client.connect();
    try {
      return await fn(client);
    } finally {
      await client.close();
    }
  };

  testDriver({
    driver: () => nodeRedisDriver({ base, url }),
    additionalTests(ctx) {
      it("saves raw data as binary", async () => {
        const helloBuffer = Buffer.from("Hello, world!", "utf8");
        const byteArray = new Uint8Array([2, 0, 2, 5]);

        await ctx.storage.setItemRaw("s4:a", helloBuffer);
        await ctx.storage.setItemRaw("s5:a", byteArray);

        expect(await ctx.storage.getItemRaw("s4:a")).toEqual(helloBuffer);
        expect(await ctx.storage.getItemRaw("s5:a")).toEqual(Buffer.from([2, 0, 2, 5]));

        await withClient(async (client) => {
          const bufferClient = client.withTypeMapping({ [RESP_TYPES.BLOB_STRING]: Buffer });
          expect(await bufferClient.get(`${base}:s4:a`)).toEqual(helloBuffer);
          expect(await bufferClient.get(`${base}:s5:a`)).toEqual(Buffer.from([2, 0, 2, 5]));
        });
      });

      it("clear(base) does not treat base as a glob", async () => {
        await ctx.storage.setItem("s1:a", "test_data");
        await ctx.storage.setItem("s2:a", "test_data");
        // `storage.clear(base)` only clears whole mounts, so call the driver
        await ctx.driver.clear!("*", {});
        await ctx.driver.clear!("s[12]", {});
        expect(await ctx.storage.getKeys()).toEqual(expect.arrayContaining(["s1:a", "s2:a"]));
      });

      it("setItem with ttl sets an expiry", async () => {
        await ctx.storage.setItem("s6:a", "a", { ttl: 1000 });

        await withClient(async (client) => {
          expect(await client.get(`${base}:s6:a`)).toBe("a");
          expect(await client.ttl(`${base}:s6:a`)).toBeGreaterThan(0);
        });
      });

      it("setItems with ttl sets each key with an expiry", async () => {
        await ctx.storage.setItems(
          [
            { key: "s7:a", value: "a" },
            { key: "s7:b", value: "b" },
          ],
          { ttl: 1000 },
        );

        await withClient(async (client) => {
          expect(await client.get(`${base}:s7:a`)).toBe("a");
          expect(await client.get(`${base}:s7:b`)).toBe("b");
          expect(await client.ttl(`${base}:s7:a`)).toBeGreaterThan(0);
        });
      });

      it("getItems returns null for missing keys", async () => {
        await ctx.storage.setItem("s8:a", "a");
        expect(await ctx.storage.getItems(["s8:a", "s8:missing"])).toMatchObject([
          { key: "s8:a", value: "a" },
          { key: "s8:missing", value: null },
        ]);
      });
    },
  });
});

// Requires a running redis cluster, e.g. `VITE_REDIS_CLUSTER_URLS=redis://localhost:7001,redis://localhost:7002`
const clusterUrls = process.env.VITE_REDIS_CLUSTER_URLS?.split(",");

describe.skipIf(!clusterUrls)("drivers: node-redis (cluster)", () => {
  testDriver({
    driver: () =>
      nodeRedisDriver({
        base: `test-${Math.round(Math.random() * 1_000_000).toString(16)}`,
        cluster: { rootNodes: clusterUrls!.map((url) => ({ url })) },
      }),
    additionalTests(ctx) {
      it("handles keys across hash slots", async () => {
        const items = Array.from({ length: 20 }, (_, i) => ({ key: `s9:${i}`, value: `v${i}` }));
        await ctx.storage.setItems(items);
        await ctx.storage.setItems(items, { ttl: 1000 });
        expect(await ctx.storage.getItems(items.map((item) => item.key))).toMatchObject(items);
        expect((await ctx.storage.getKeys("s9")).length).toBe(20);
        await ctx.storage.clear();
        expect(await ctx.storage.getKeys("s9")).toEqual([]);
      });
    },
  });
});

describe("drivers: node-redis (connection failures)", () => {
  // Minimal fake redis server answering every command with `OK`
  const startServer = async (port = 0) => {
    const sockets = new Set<Socket>();
    const server = createServer((socket) => {
      sockets.add(socket);
      socket.on("error", () => {});
      socket.on("data", (data) => {
        const commands = data.toString().match(/(^|\r\n)\*\d+\r\n/g)?.length || 1;
        socket.write("+OK\r\n".repeat(commands));
      });
    });
    await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve));
    return {
      url: `redis://127.0.0.1:${(server.address() as AddressInfo).port}`,
      port: (server.address() as AddressInfo).port,
      stop: async () => {
        for (const socket of sockets) {
          socket.destroy();
        }
        await new Promise((resolve) => server.close(resolve));
      },
    };
  };
  const getUnusedUrl = async () => {
    const server = await startServer();
    await server.stop();
    return server;
  };

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("queues commands while connecting", async () => {
    const server = await startServer();
    const driver = nodeRedisDriver({ url: server.url });
    expect(await driver.getItem("key", {})).toBe("OK");
    await driver.dispose!();
    await server.stop();
  });

  it("keeps reconnecting like ioredis by default", async () => {
    const createClient = vi.fn(redis.createClient);
    const driver = nodeRedisDriver({ lib: { ...redis, createClient } as typeof redis });
    await driver.getInstance!();
    await driver.dispose!();

    const { reconnectStrategy } = createClient.mock.calls[0]![0]!.socket as {
      reconnectStrategy: (retries: number, cause: Error) => number | false;
    };
    expect(reconnectStrategy(0, new Error("ECONNREFUSED"))).toBe(50);
    expect(reconnectStrategy(19, new Error("ECONNREFUSED"))).toBe(1000);
    expect(reconnectStrategy(100, new Error("ECONNREFUSED"))).toBe(2000);
    expect(reconnectStrategy(0, new redis.SocketTimeoutError(1000))).toBe(50);
  });

  it("retries if the client cannot be created", async () => {
    const server = await startServer();
    const createClient = vi.fn(redis.createClient).mockImplementationOnce(() => {
      throw new Error("failed");
    });
    const driver = nodeRedisDriver({
      url: server.url,
      lib: { ...redis, createClient } as typeof redis,
    });
    await expect(driver.getItem("key", {})).rejects.toThrow("failed");
    expect(await driver.getItem("key", {})).toBe("OK");
    await driver.dispose!();
    await server.stop();
  });

  it("keeps a configured reconnect strategy", async () => {
    const createClient = vi.fn(redis.createClient);
    const driver = nodeRedisDriver({
      lib: { ...redis, createClient } as typeof redis,
      socket: { reconnectStrategy: false },
    });
    await driver.getInstance!();
    await driver.dispose!();
    expect(createClient.mock.calls[0]![0]!.socket?.reconnectStrategy).toBe(false);
  });

  it("rejects pending commands and retries if a configured strategy gives up", async () => {
    const { url, port } = await getUnusedUrl();
    const driver = nodeRedisDriver({
      url,
      socket: { reconnectStrategy: (retries) => (retries >= 2 ? false : 10) },
    });
    await expect(driver.getItem("key", {})).rejects.toThrow("ECONNREFUSED");

    const server = await startServer(port);
    expect(await driver.getItem("key", {})).toBe("OK");
    await driver.dispose!();
    await server.stop();
  });

  it("rejects pending commands after a configured command timeout", async () => {
    const { url } = await getUnusedUrl();
    const driver = nodeRedisDriver({ url, commandOptions: { timeout: 100 } });
    await expect(driver.getItem("key", {})).rejects.toThrow(redis.TimeoutError);
    await driver.dispose!();
  });

  it("disposes while connecting", async () => {
    const { url } = await getUnusedUrl();
    const driver = nodeRedisDriver({ url });
    const pending = driver.getItem("key", {});
    await new Promise((resolve) => setTimeout(resolve, 100));
    await driver.dispose!();
    await expect(pending).rejects.toThrow();
  });

  it("disposes while reconnecting with pending commands", async () => {
    const server = await startServer();
    const driver = nodeRedisDriver({ url: server.url });
    expect(await driver.getItem("key", {})).toBe("OK");
    await server.stop();
    await new Promise((resolve) => setTimeout(resolve, 100));

    const pending = driver.getItem("key", {});
    await driver.dispose!();
    await expect(pending).rejects.toThrow();
  });

  it("times out commands after 5 seconds by default, like redis v6", async () => {
    const createClient = vi.fn(redis.createClient);
    const lib = { ...redis, createClient } as typeof redis;
    for (const commandOptions of [undefined, { timeout: 100 }, { timeout: 0 }]) {
      const driver = nodeRedisDriver({ lib, commandOptions });
      await driver.getInstance!();
      await driver.dispose!();
    }
    expect(createClient.mock.calls.map(([options]) => options!.commandOptions)).toEqual([
      { timeout: 5000 },
      { timeout: 100 },
      { timeout: 0 },
    ]);
  });

  it("rejects calls after dispose like ioredis", async () => {
    const server = await startServer();
    const createClient = vi.fn(redis.createClient);
    const driver = nodeRedisDriver({
      url: server.url,
      lib: { ...redis, createClient } as typeof redis,
    });
    const client = await driver.getInstance!();
    expect(await driver.getItem("key", {})).toBe("OK");

    await driver.dispose!();
    expect(client.isOpen).toBe(false);
    expect(await driver.getInstance!()).toBe(client);
    await expect(driver.getItem("key", {})).rejects.toThrow(redis.ClientClosedError);
    await driver.dispose!();
    expect(createClient).toHaveBeenCalledTimes(1);
    await server.stop();
  });

  it("rejects calls after dispose without a client like ioredis", async () => {
    const server = await startServer();
    const driver = nodeRedisDriver({ url: server.url });
    await driver.dispose!();
    expect((await driver.getInstance!()).isOpen).toBe(false);
    await expect(driver.getItem("key", {})).rejects.toThrow(redis.ClientClosedError);
    await server.stop();
  });

  it("does not log errors when disposing", async () => {
    const server = await startServer();
    const driver = nodeRedisDriver({ url: server.url });
    expect(await driver.getItem("key", {})).toBe("OK");
    await driver.dispose!();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(console.error).not.toHaveBeenCalled();
    await server.stop();
  });

  it("only logs errors without other listeners", async () => {
    const { url } = await getUnusedUrl();
    const options = { url, socket: { reconnectStrategy: false } } as const;
    const driver = nodeRedisDriver(options);
    await expect(driver.getItem("key", {})).rejects.toThrow("ECONNREFUSED");
    expect(console.error).toHaveBeenCalledTimes(1);

    const listenedDriver = nodeRedisDriver(options);
    const onError = vi.fn();
    (await listenedDriver.getInstance!()).on("error", onError);
    await expect(listenedDriver.getItem("key", {})).rejects.toThrow("ECONNREFUSED");
    expect(onError).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledTimes(1);
  });
});
