import { createHash } from "node:crypto";
import {
  createRequiredError,
  type DriverFactory,
  importLib,
  type LibImport,
  type DriverDependencies,
} from "./utils/index.ts";
import { CASMismatchError } from "./utils/cas.ts";
import type { Collection, MongoClient, MongoClientOptions } from "mongodb";

export interface MongoDbOptions {
  /**
   * The MongoDB connection string.
   */
  connectionString: string;

  /**
   * Optional configuration settings for the MongoClient instance.
   */
  clientOptions?: MongoClientOptions;

  /**
   * The name of the database to use.
   * @default "unstorage"
   */
  databaseName?: string;

  /**
   * The name of the collection to use.
   * @default "unstorage"
   */
  collectionName?: string;

  /**
   * Optionally provide the [`mongodb`](https://www.npmjs.com/package/mongodb) library
   * to avoid dynamically importing it.
   */
  lib?: LibImport<typeof import("mongodb")>;
}

export const DRIVER_DEPENDENCIES: DriverDependencies = {
  lib: { name: "mongodb", version: "^6 || ^7" },
};

const DRIVER_NAME = "mongodb";

// SHA-1 of the serialized value. Content-addressable; matches the redis driver.
const computeEtag = (value: unknown): string => {
  const buf = Buffer.from(typeof value === "string" ? value : JSON.stringify(value));
  return createHash("sha1").update(buf).digest("hex");
};

const isDuplicateKeyError = (err: unknown): boolean =>
  !!err && typeof err === "object" && (err as { code?: number }).code === 11_000;

const driver: DriverFactory<MongoDbOptions, Promise<Collection>> = (opts) => {
  let collection: Promise<Collection> | undefined;
  let client: MongoClient | undefined;
  const getMongoCollection = () =>
    (collection ??= (async () => {
      if (!opts.connectionString) {
        throw createRequiredError(DRIVER_NAME, "connectionString");
      }
      const { MongoClient } = await importLib(
        DRIVER_NAME,
        "mongodb",
        opts.lib,
        () => import("mongodb"),
      );
      client = new MongoClient(opts.connectionString, opts.clientOptions);
      const db = client.db(opts.databaseName || "unstorage");
      const col = db.collection(opts.collectionName || "unstorage");
      // Unique index on `key` is what makes create-only (`ifNoneMatch:"*"`) CAS atomic.
      await col.createIndex({ key: 1 }, { unique: true }).catch(() => {});
      return col;
    })());

  const setWithCAS = async (
    key: string,
    value: unknown,
    tOptions: { ifMatch?: string; ifNoneMatch?: string },
  ): Promise<{ etag: string }> => {
    const col = await getMongoCollection();
    const now = new Date();
    const etag = computeEtag(value);
    const { ifMatch, ifNoneMatch } = tOptions;

    // Create-only: rely on the unique index for atomicity.
    if (ifNoneMatch === "*" && ifMatch === undefined) {
      try {
        await col.insertOne({
          key,
          value,
          _etag: etag,
          createdAt: now,
          modifiedAt: now,
        });
      } catch (err) {
        if (isDuplicateKeyError(err)) {
          throw new CASMismatchError(DRIVER_NAME, key);
        }
        throw err;
      }
      return { etag };
    }

    // ifMatch:* — require existence; no upsert.
    if (ifMatch === "*" && ifNoneMatch === undefined) {
      const r = await col.updateOne({ key }, { $set: { value, _etag: etag, modifiedAt: now } });
      if (r.matchedCount === 0) {
        throw new CASMismatchError(DRIVER_NAME, key);
      }
      return { etag };
    }

    // ifMatch:<etag> — exact-match update; no upsert.
    if (ifMatch !== undefined && ifNoneMatch === undefined) {
      const r = await col.updateOne(
        { key, _etag: ifMatch },
        { $set: { value, _etag: etag, modifiedAt: now } },
      );
      if (r.matchedCount === 0) {
        throw new CASMismatchError(DRIVER_NAME, key);
      }
      return { etag };
    }

    // ifNoneMatch:<etag> — succeed when absent or current etag differs.
    // Filter excludes the forbidden etag; unique-index dup-key on upsert
    // signals "current etag matches the forbidden one" → mismatch.
    if (ifNoneMatch !== undefined && ifMatch === undefined) {
      try {
        await col.updateOne(
          { key, _etag: { $ne: ifNoneMatch } },
          {
            $set: { value, _etag: etag, modifiedAt: now },
            $setOnInsert: { key, createdAt: now },
          },
          { upsert: true },
        );
      } catch (err) {
        if (isDuplicateKeyError(err)) {
          throw new CASMismatchError(DRIVER_NAME, key);
        }
        throw err;
      }
      return { etag };
    }

    // Combined ifMatch + ifNoneMatch — both must hold; ifMatch implies
    // existence so no upsert is needed.
    if (ifNoneMatch === "*" || (ifMatch !== undefined && ifMatch === ifNoneMatch)) {
      throw new CASMismatchError(DRIVER_NAME, key);
    }
    const filter: Record<string, unknown> = { key };
    if (ifMatch !== undefined && ifMatch !== "*") {
      filter._etag = ifMatch;
    } else if (ifNoneMatch !== undefined && ifNoneMatch !== "*") {
      // ifMatch is `"*"` (existence already enforced by the `key` lookup)
      // or undefined; ifNoneMatch is a concrete etag → require $ne.
      filter._etag = { $ne: ifNoneMatch };
    }
    const r = await col.updateOne(filter, {
      $set: { value, _etag: etag, modifiedAt: now },
    });
    if (r.matchedCount === 0) {
      throw new CASMismatchError(DRIVER_NAME, key);
    }
    return { etag };
  };

  return {
    name: DRIVER_NAME,
    flags: { cas: true },
    options: opts,
    getInstance: getMongoCollection,
    async hasItem(key) {
      const result = await (await getMongoCollection()).findOne({ key });
      return !!result;
    },
    async getItem(key) {
      const document = await (await getMongoCollection()).findOne({ key });
      return document?.value ?? null;
    },
    async getItems(items) {
      const keys = items.map((item) => item.key);

      const result = await (await getMongoCollection()).find({ key: { $in: keys } }).toArray();

      // return result in correct order
      const resultMap = new Map(result.map((doc) => [doc.key, doc]));
      return keys.map((key) => {
        return { key: key, value: resultMap.get(key)?.value ?? null };
      });
    },
    async setItem(key, value, tOptions) {
      if (tOptions?.ifMatch !== undefined || tOptions?.ifNoneMatch !== undefined) {
        return setWithCAS(key, value, tOptions);
      }
      const now = new Date();
      await (
        await getMongoCollection()
      ).updateOne(
        { key },
        {
          $set: { key, value, _etag: computeEtag(value), modifiedAt: now },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true },
      );
    },
    async setItems(items) {
      const now = new Date();
      const operations = items.map(({ key, value }) => ({
        updateOne: {
          filter: { key },
          update: {
            $set: { key, value, _etag: computeEtag(value), modifiedAt: now },
            $setOnInsert: { createdAt: now },
          },
          upsert: true,
        },
      }));
      await (await getMongoCollection()).bulkWrite(operations);
    },
    async removeItem(key) {
      await (await getMongoCollection()).deleteOne({ key });
    },
    async getKeys() {
      return await (
        await getMongoCollection()
      )
        .find()
        .project({ key: true })
        .map((d) => d.key)
        .toArray();
    },
    async getMeta(key) {
      const document = await (await getMongoCollection()).findOne({ key });
      return document
        ? {
            mtime: document.modifiedAt,
            birthtime: document.createdAt,
            etag: document._etag,
          }
        : {};
    },
    async clear() {
      await (await getMongoCollection()).deleteMany({});
    },
    async dispose() {
      if (collection) {
        // Wait for any pending connection attempt to settle before closing it
        await collection.catch(() => {});
        collection = undefined;
        await client?.close();
        client = undefined;
      }
    },
  };
};

export default driver;
