import {
  createRequiredError,
  type DriverFactory,
  importLib,
  type LibImport,
  type DriverDependencies,
} from "./utils/index.ts";
import type {
  CollectionReference,
  DocumentReference,
  DocumentSnapshot,
  Firestore,
  Query,
  Timestamp,
} from "firebase/firestore";
import type { WatchCallback } from "../types.ts";

export interface FirebaseFirestoreOptions {
  /**
   * A Firestore instance, from `getFirestore()` or `initializeFirestore()` in `firebase/firestore`.
   */
  firestore: Firestore;

  /**
   * Path of the collection that holds the entries, e.g. `users/<uid>/kv`.
   * @default "unstorage"
   */
  collection?: string;

  /**
   * Optionally provide the [`firebase/firestore`](https://www.npmjs.com/package/firebase) module
   * to avoid dynamically importing it. Pass the same module your `firestore` instance comes from.
   */
  lib?: LibImport<typeof import("firebase/firestore")>;

  /**
   * Start `watch` from Firestore's local cache and fetch from the server only entries written
   * since the newest cached one, so each entry is read once per client instead of on every
   * start. Fits collections that are only added to: an entry another client removes is not
   * noticed while it is still in this client's cache. Use with a persistent local cache large
   * enough to keep the whole collection.
   * @default false
   */
  incremental?: boolean;
}

export const DRIVER_DEPENDENCIES: DriverDependencies = {
  lib: { name: "firebase", import: "firebase/firestore", version: ">=11" },
};

const DRIVER_NAME = "firebase-firestore";

/** Commits become visible in about their timestamp order; re-read a little to be sure. */
const INCREMENTAL_OVERLAP_MS = 60_000;

/** Firestore limits: values in an `in` filter, and writes in one batch. */
const IN_LIMIT = 30;
const BATCH_LIMIT = 500;

/**
 * A valid document id for any key: no `/`, never `.` or `..`, never `__name__`.
 * Also escaping `.` and `_` on top of `encodeURIComponent` keeps it reversible.
 */
export function escapeKey(key: string): string {
  return encodeURIComponent(key).replace(
    /[._]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/**
 * The first string after every string that starts with `prefix`, or nothing if there is none.
 * Firestore orders strings by their UTF-8 bytes, which is code point order, so this bumps the
 * last code point that can be bumped (skipping the surrogate range, which no string holds).
 */
function afterPrefix(prefix: string): string | undefined {
  const points = [...prefix];
  while (points.length > 0) {
    const last = points.pop()!.codePointAt(0)!;
    if (last < 0x10_ff_ff) {
      return points.join("") + String.fromCodePoint(last + 1 === 0xd8_00 ? 0xe0_00 : last + 1);
    }
  }
  return undefined;
}

function chunks<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, n) =>
    items.slice(n * size, (n + 1) * size),
  );
}

const driver: DriverFactory<FirebaseFirestoreOptions, Promise<CollectionReference>> = (opts) => {
  let lib: Promise<typeof import("firebase/firestore")> | undefined;
  const getLib = () => (lib ??= importLib(DRIVER_NAME, "firebase/firestore", opts.lib));

  const getCollection = async () => {
    if (!opts.firestore) {
      throw createRequiredError(DRIVER_NAME, "firestore");
    }
    const { collection } = await getLib();
    return collection(opts.firestore, opts.collection || "unstorage");
  };

  const entry = async (key: string) => (await getLib()).doc(await getCollection(), escapeKey(key));

  /** Every entry whose key starts with `base`, or all of them. */
  const underBase = async (base?: string): Promise<Query> => {
    const { query, where } = await getLib();
    const entries = await getCollection();
    if (!base) return entries;
    const end = afterPrefix(base);
    return end
      ? query(entries, where("key", ">=", base), where("key", "<", end))
      : query(entries, where("key", ">=", base));
  };

  type Entry = { value: unknown; modifiedAt?: Timestamp };
  const fromDoc = (d: DocumentSnapshot): Entry => ({
    value: d.get("value"),
    // A write not yet confirmed by the server only has an estimated time.
    modifiedAt: d.get("modifiedAt", { serverTimestamps: "estimate" }),
  });

  let unsubscribes: (() => void)[] = [];
  // While watching, the collection as this client knows it: from the listener, plus this client's
  // writes. Reads are answered from it, so watching costs one read per document and later reads
  // cost nothing.
  let live: Map<string, Entry> | undefined;
  let notify: WatchCallback | undefined;
  // Each watch owns one generation; stopping moves on to the next, so a watch still starting
  // knows it was stopped, and an old watch's stop function leaves a newer watch alone.
  let generation = 0;
  let settleStart: (() => void) | undefined;

  const stopWatching = () => {
    generation++;
    settleStart?.();
    settleStart = undefined;
    for (const stop of unsubscribes) stop();
    unsubscribes = [];
    live = undefined;
    notify = undefined;
  };

  // How many times this client changed each held key, so a slower read of the cache can tell
  // that a newer write to the same key came after it began.
  const revisions = new Map<string, number>();
  const revise = (key: string) => revisions.set(key, (revisions.get(key) ?? 0) + 1);

  /** Records this client's own write in the held copy, and reports it once. */
  const heldWrite = (key: string, value: unknown) => {
    if (!live) return;
    revise(key);
    live.set(key, { value });
    notify?.("update", key);
  };

  const heldRemove = (key: string) => {
    revise(key);
    if (live?.delete(key)) notify?.("remove", key);
  };

  /** Holds what a document now says (or that it is gone), and reports it if the value changed. */
  const hold = (
    held: Map<string, Entry>,
    key: string,
    d: DocumentSnapshot | undefined,
    report?: WatchCallback,
  ) => {
    const before = held.get(key)?.value;
    if (d?.exists()) {
      held.set(key, fromDoc(d));
      if (before !== d.get("value")) report?.("update", key);
    } else if (held.delete(key)) {
      report?.("remove", key);
    }
  };

  /**
   * After the server refused writes, holds what Firestore has locally once it rolled them back.
   * The listener may not see the rollback: an incremental watch only asks for newer entries.
   */
  const restoreHeld = async (keys: string[]) => {
    if (!live) return;
    const { getDocFromCache } = await getLib();
    for (const key of keys) {
      const revision = revisions.get(key);
      const d = await getDocFromCache(await entry(key)).catch(() => undefined);
      if (live && revisions.get(key) === revision) hold(live, key, d, notify);
    }
  };

  /** Commits a write; if the server refuses it, the held copy goes back to what is stored. */
  const committed = (write: Promise<void>, keys: string[]) =>
    write.catch(async (error) => {
      await restoreHeld(keys);
      throw error;
    });

  /**
   * What the server is asked for when watching starts, given the server times of the entries
   * already held. Only times the server confirmed count: an unconfirmed write has only this
   * client's estimate, and a clock running ahead would move the cut-off past entries to come.
   */
  const watchedQuery = async (heldTimes: number[]): Promise<Query> => {
    const entries = await getCollection();
    let newest = 0;
    for (const time of heldTimes) newest = Math.max(newest, time);
    if (!opts.incremental || newest === 0) return entries;
    const { Timestamp, getCountFromServer, query, where } = await getLib();
    const since = Timestamp.fromMillis(newest - INCREMENTAL_OVERLAP_MS);
    // A cache can hold a newer entry without the older ones, for example after reading just that
    // one, so check it has as many entries up to `since` as the server does. A count costs one
    // read per 1000 entries. Offline it fails, and the cache is trusted until the next start.
    const onServer = await getCountFromServer(
      query(entries, where("modifiedAt", "<=", since)),
    ).then(
      (count) => count.data().count,
      () => undefined,
    );
    let heldUpToSince = 0;
    for (const time of heldTimes) {
      if (time <= since.toMillis()) heldUpToSince++;
    }
    if (onServer !== undefined && heldUpToSince < onServer) return entries;
    return query(entries, where("modifiedAt", ">", since));
  };

  return {
    name: DRIVER_NAME,
    options: opts,
    getInstance: getCollection,
    async hasItem(key) {
      if (live) return live.has(key);
      const { getDoc } = await getLib();
      return (await getDoc(await entry(key))).exists();
    },
    async getItem(key) {
      if (live) return live.get(key)?.value ?? null;
      const { getDoc } = await getLib();
      const snapshot = await getDoc(await entry(key));
      return snapshot.exists() ? snapshot.get("value") : null;
    },
    async getItems(items) {
      const keys = items.map((item) => item.key);
      if (live) {
        const docs = live;
        return keys.map((key) => ({
          key,
          value: docs.get(key)?.value ?? null,
        }));
      }
      const { getDocs, query, where } = await getLib();
      const entries = await getCollection();
      const values = new Map<string, unknown>();
      for (const group of chunks(keys, IN_LIMIT)) {
        const found = await getDocs(query(entries, where("key", "in", group)));
        for (const d of found.docs) {
          values.set(d.get("key"), d.get("value"));
        }
      }
      // return result in the order asked
      return keys.map((key) => ({ key, value: values.get(key) ?? null }));
    },
    async setItem(key, value) {
      heldWrite(key, value);
      const { setDoc, serverTimestamp } = await getLib();
      await committed(
        setDoc(await entry(key), {
          key,
          value,
          modifiedAt: serverTimestamp(),
        }),
        [key],
      );
    },
    // Each batch of up to 500 is atomic: its entries land together or not at all.
    // The held copy takes each batch as it is sent, so a batch never sent is never held, and goes
    // back to what is stored if the server refuses it.
    async setItems(items) {
      const { writeBatch, serverTimestamp } = await getLib();
      for (const group of chunks(items, BATCH_LIMIT)) {
        const batch = writeBatch(opts.firestore);
        for (const { key, value } of group) {
          batch.set(await entry(key), {
            key,
            value,
            modifiedAt: serverTimestamp(),
          });
        }
        for (const { key, value } of group) heldWrite(key, value);
        await committed(
          batch.commit(),
          group.map((item) => item.key),
        );
      }
    },
    async removeItem(key) {
      heldRemove(key);
      const { deleteDoc } = await getLib();
      await committed(deleteDoc(await entry(key)), [key]);
    },
    async getKeys(base) {
      if (live) return [...live.keys()].filter((key) => !base || key.startsWith(base));
      const { getDocs } = await getLib();
      return (await getDocs(await underBase(base))).docs.map((d) => d.get("key"));
    },
    async getMeta(key) {
      const modified = live
        ? live.get(key)?.modifiedAt
        : fromDoc(await (await getLib()).getDoc(await entry(key))).modifiedAt;
      return modified ? { mtime: modified.toDate() } : {};
    },
    async clear(base) {
      const { getDocs, writeBatch } = await getLib();
      const docs = (await getDocs(await underBase(base))).docs;
      for (const group of chunks(docs, BATCH_LIMIT)) {
        const batch = writeBatch(opts.firestore);
        for (const d of group) {
          batch.delete(d.ref);
          heldRemove(d.get("key"));
        }
        await committed(
          batch.commit(),
          group.map((d) => d.get("key")),
        );
      }
    },
    dispose() {
      stopWatching();
    },
    // Resolves with the first snapshot, which may come from this client's cache, so watching
    // starts offline too. From then on, reads see what this client knows, and everything the
    // server adds to that, or that changes later on this client or any other, is reported as it
    // arrives. Each change is reported once: the listener's echoes of a write (pending, then
    // confirmed with its server time) carry no new value.
    async watch(callback) {
      stopWatching();
      const mine = generation;
      const stopped = () => mine !== generation;
      const unwatch = () => {
        if (!stopped()) stopWatching();
      };
      const { getDocsFromCache, onSnapshot } = await getLib();
      const entries = await getCollection();
      const docs = new Map<string, Entry>();
      const heldTimes: number[] = [];
      // Writes this client made earlier that the server has not confirmed yet.
      const pending: DocumentSnapshot[] = [];
      if (opts.incremental) {
        // Free: no server reads. Fails without a cache, and then everything is fetched.
        const cached = await getDocsFromCache(entries).catch(() => undefined);
        for (const d of cached?.docs ?? []) {
          docs.set(d.get("key"), fromDoc(d));
          // Without the estimate option, a time the server has not confirmed reads as null.
          const confirmed: Timestamp | null = d.get("modifiedAt");
          if (confirmed) heldTimes.push(confirmed.toMillis());
          else if (d.metadata.hasPendingWrites) pending.push(d);
        }
      }
      const watched = await watchedQuery(heldTimes);
      if (stopped()) return unwatch;
      let first = true;
      const report = () => (first ? undefined : callback);
      // An incremental query has no server time to match a pending write by: such a write drops
      // out of its results while the document still exists. So each one is followed on its own,
      // holding what it says, until the server confirms it, refuses it, or it is deleted.
      const narrowed = watched.type === "query";
      const follow = (ref: DocumentReference, key: string) => {
        const stop = onSnapshot(ref, (now) => {
          if (stopped()) return;
          hold(docs, key, now, report());
          if (!now.metadata.hasPendingWrites) stop();
        });
        unsubscribes.push(stop);
      };
      for (const d of pending) follow(d.ref, d.get("key"));
      await new Promise<void>((resolve, reject) => {
        settleStart = resolve;
        const stop = onSnapshot(
          watched,
          (snapshot) => {
            if (stopped()) return;
            for (const change of snapshot.docChanges()) {
              if (stopped()) return;
              const key = change.doc.get("key");
              if (change.type !== "removed") hold(docs, key, change.doc, report());
              else if (narrowed) follow(change.doc.ref, key);
              // Without a filter, only a deletion takes an entry out.
              else hold(docs, key, undefined, report());
            }
            if (first) {
              first = false;
              settleStart = undefined;
              live = docs;
              notify = callback;
              resolve();
            }
          },
          (error) => {
            // A failed start rejects, rather than being settled as stopped. Reads go back to
            // asking Firestore directly.
            settleStart = undefined;
            reject(error);
            unwatch();
          },
        );
        unsubscribes.push(stop);
      });
      return unwatch;
    },
  };
};

export default driver;
