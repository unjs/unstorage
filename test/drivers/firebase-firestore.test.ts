import { afterAll, describe, expect, it } from "vitest";
import { deleteApp, initializeApp } from "firebase/app";
import * as firestoreLib from "firebase/firestore";
import driver, { escapeKey } from "../../src/drivers/firebase-firestore.ts";
import { testDriver } from "./utils.ts";
import { createStorage } from "../../src/index.ts";

// Runs against the Firestore emulator, e.g.:
//   npx firebase-tools emulators:exec --only firestore --project demo-unstorage "pnpm vitest run test/drivers/firebase-firestore"
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;

describe.skipIf(!emulatorHost)("drivers: firebase-firestore", () => {
  const app = initializeApp({ projectId: "demo-unstorage" }, "unstorage-test");
  const firestore = firestoreLib.getFirestore(app);
  const [host, port] = (emulatorHost || "localhost:8080").split(":");
  firestoreLib.connectFirestoreEmulator(firestore, host!, Number(port));

  // A second client that keeps what it has fetched, as a persistent cache would.
  const cachingApp = initializeApp({ projectId: "demo-unstorage" }, "unstorage-test-cache");
  const cachingFirestore = firestoreLib.initializeFirestore(cachingApp, {
    localCache: firestoreLib.memoryLocalCache({
      garbageCollector: firestoreLib.memoryLruGarbageCollector({
        cacheSizeBytes: firestoreLib.CACHE_SIZE_UNLIMITED,
      }),
    }),
  });
  firestoreLib.connectFirestoreEmulator(cachingFirestore, host!, Number(port));

  afterAll(async () => {
    await Promise.all([
      firestoreLib.terminate(firestore),
      firestoreLib.terminate(cachingFirestore),
    ]);
    await Promise.all([deleteApp(app), deleteApp(cachingApp)]);
  });

  testDriver({
    driver: driver({ firestore, collection: "test", lib: firestoreLib }),
    additionalTests: (ctx) => {
      it("should throw error if no firestore is provided", async () => {
        await expect(() =>
          driver({ lib: firestoreLib } as any).getItem!("a", {}),
        ).rejects.toThrowError(
          "[unstorage] [firebase-firestore] Missing required option `firestore`.",
        );
      });
      it("stores keys that are not valid Firestore document ids", async () => {
        const keys = ["__name__", "a.b", "...x", "100%", "emoji:🥨"];
        for (const key of keys) await ctx.storage.setItem(key, key);
        for (const key of keys) expect(await ctx.storage.getItem(key)).toBe(key);
        expect(escapeKey("..")).toBe("%2E%2E");
        expect(decodeURIComponent(escapeKey("a/b.c_d%e"))).toBe("a/b.c_d%e");
      });
      it("gets more items than one `in` query allows", async () => {
        const keys = Array.from({ length: 45 }, (_, n) => `many:${n}`);
        await ctx.storage.setItems(keys.map((key, n) => ({ key, value: n })));
        const items = await ctx.storage.getItems([...keys, "many:missing"]);
        expect(items[44]).toMatchObject({ key: "many:44", value: 44 });
        expect(items[45]).toMatchObject({ key: "many:missing", value: null });
      });
      it("clears only keys under a base", async () => {
        await ctx.storage.setItems([
          { key: "a:1", value: 1 },
          { key: "b:1", value: 2 },
        ]);
        await ctx.driver.clear!("b:", {});
        expect(await ctx.storage.getKeys()).toMatchObject(["a:1"]);
      });
      it("lists and clears keys with characters beyond the Basic Multilingual Plane", async () => {
        await ctx.storage.setItems([
          { key: "log:🥨", value: 1 },
          { key: "log:\uFFFF", value: 2 },
          { key: "loh", value: 3 },
        ]);
        expect((await ctx.storage.getKeys("log:")).sort()).toEqual(["log:\uFFFF", "log:🥨"].sort());
        await ctx.driver.clear!("log:", {});
        expect(await ctx.storage.getKeys()).toEqual(["loh"]);
      });
      it("a watch stopped while it is starting settles, and stays stopped", async () => {
        const watcher = driver({ firestore, collection: "test", lib: firestoreLib });
        const heard: string[] = [];
        const starting = watcher.watch!((event, key) => heard.push(`${event} ${key}`));
        await watcher.dispose!();
        await expect(starting).resolves.toBeTypeOf("function");
        await ctx.storage.setItem("after-stop", 1);
        await new Promise((resolve) => setTimeout(resolve, 200));
        expect(heard).toEqual([]);
      });
      it("a watch whose listener fails before its first snapshot rejects", async () => {
        const failing = driver({
          firestore,
          collection: "test",
          lib: {
            ...firestoreLib,
            onSnapshot: ((_query: unknown, _next: unknown, error: (e: Error) => void) => {
              error(new Error("permission denied"));
              return () => {};
            }) as any,
          },
        });
        await expect(failing.watch!(() => {})).rejects.toThrow("permission denied");
      });
      it("unwatching an earlier watch leaves a newer one running", async () => {
        const watcher = driver({ firestore, collection: "test", lib: firestoreLib });
        const earlier = await watcher.watch!(() => {});
        const heard: string[] = [];
        const later = await watcher.watch!((event, key) => heard.push(`${event} ${key}`));
        await earlier();
        await ctx.storage.setItem("still-heard", 1);
        await expect.poll(() => heard).toEqual(["update still-heard"]);
        await later();
      });
      it("a batch that fails partway leaves reads matching what was stored", async () => {
        const unwatch = await ctx.storage.watch(() => {});
        const items: { key: string; value: unknown }[] = Array.from({ length: 502 }, (_, n) => ({
          key: `batch:${n}`,
          value: n,
        }));
        // Firestore refuses a function value while building the second batch.
        items[501] = { key: "batch:501", value: () => {} };
        await expect(ctx.driver.setItems!(items as any, {})).rejects.toThrow();
        expect(await ctx.storage.getItem("batch:499")).toBe(499);
        expect(await ctx.storage.getItem("batch:500")).toBe(null);
        await unwatch();
      });
      it("has mtime in meta", async () => {
        await ctx.storage.setItem("dated", 1);
        expect((await ctx.storage.getMeta("dated")).mtime).toBeInstanceOf(Date);
      });
      it("watches changes", async () => {
        await ctx.storage.setItem("existing", 1);
        const events: string[] = [];
        const unwatch = await ctx.storage.watch((event, key) => events.push(`${event} ${key}`));
        await ctx.storage.setItem("fresh", 2);
        await ctx.storage.removeItem("existing");
        await expect.poll(() => events).toEqual(["update fresh", "remove existing"]);
        await unwatch();
      });
      it("answers reads from the listener while watching, kept current by other clients", async () => {
        await ctx.storage.setItems([
          { key: "log:1", value: 1 },
          { key: "other", value: 2 },
        ]);
        const unwatch = await ctx.storage.watch(() => {});
        expect(await ctx.storage.getKeys("log")).toEqual(["log:1"]);
        const otherClient = createStorage({
          driver: driver({ firestore, collection: "test", lib: firestoreLib }),
        });
        await otherClient.setItem("log:2", 3);
        await expect.poll(() => ctx.storage.getItem("log:2")).toBe(3);
        expect(await ctx.storage.getItems(["log:1", "log:3"])).toMatchObject([
          { key: "log:1", value: 1 },
          { key: "log:3", value: null },
        ]);
        await unwatch();
        expect(await ctx.storage.getItem("log:2")).toBe(3);
      });
      it("incrementally, a reopened client starts from its cache and still gets what is new", async () => {
        await ctx.storage.setItems([
          { key: "log:1", value: 1 },
          { key: "log:2", value: 2 },
        ]);
        const reader = () =>
          createStorage({
            driver: driver({
              firestore: cachingFirestore,
              collection: "test",
              lib: firestoreLib,
              incremental: true,
            }),
          });
        await (
          await reader().watch(() => {})
        )();

        // Offline, the next start has everything from the cache alone.
        await firestoreLib.disableNetwork(cachingFirestore);
        const reopened = reader();
        const heard: string[] = [];
        const unwatch = await reopened.watch((event, key) => heard.push(`${event} ${key}`));
        expect((await reopened.getKeys("log")).sort()).toEqual(["log:1", "log:2"]);

        // Back online, entries written meanwhile arrive; older ones are not reported again.
        await ctx.storage.setItem("log:3", 3);
        await firestoreLib.enableNetwork(cachingFirestore);
        await expect.poll(() => reopened.getItem("log:3")).toBe(3);
        expect(heard).toEqual(["update log:3"]);
        await unwatch();
      });
      it("incrementally, a clock running ahead does not hide entries written meanwhile", async () => {
        const reader = () =>
          createStorage({
            driver: driver({
              firestore: cachingFirestore,
              collection: "test",
              lib: firestoreLib,
              incremental: true,
            }),
          });
        await ctx.storage.setItem("skew:1", 1);
        await (
          await reader().watch(() => {})
        )();

        // Offline, with a clock ten minutes ahead, this client writes: the server time is pending.
        await firestoreLib.disableNetwork(cachingFirestore);
        const realNow = Date.now;
        Date.now = () => realNow() + 600_000;
        const pending = reader().setItem("skew:mine", 2);
        // The write is queued only after the driver's own awaits; keep the clock ahead until then.
        await new Promise((resolve) => setTimeout(resolve, 100));
        Date.now = realNow;

        const reopened = reader();
        const unwatch = await reopened.watch(() => {});
        await ctx.storage.setItem("skew:other", 3);
        await firestoreLib.enableNetwork(cachingFirestore);
        await pending;
        await expect.poll(() => reopened.getItem("skew:other")).toBe(3);
        await unwatch();
      });
      it("incrementally, a client that has only read some entries still gets older ones", async () => {
        const entries = firestoreLib.collection(firestore, "test");
        // Written well before the newer entry, as on another day.
        await firestoreLib.setDoc(firestoreLib.doc(entries, escapeKey("old:1")), {
          key: "old:1",
          value: 1,
          modifiedAt: firestoreLib.Timestamp.fromMillis(Date.now() - 600_000),
        });
        await ctx.storage.setItem("old:2", 2);
        const reader = createStorage({
          driver: driver({
            firestore: cachingFirestore,
            collection: "test",
            lib: firestoreLib,
            incremental: true,
          }),
        });
        // Only the newer entry reaches this client's cache before it first watches.
        expect(await reader.getItem("old:2")).toBe(2);
        const unwatch = await reader.watch(() => {});
        await expect
          .poll(async () => (await reader.getKeys("old:")).sort())
          .toEqual(["old:1", "old:2"]);
        await unwatch();
      });
    },
  });
});
