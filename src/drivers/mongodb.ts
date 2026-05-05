import { createHash } from "node:crypto";
import { createRequiredError, type DriverFactory } from "./utils/index.ts";
import { CASMismatchError } from "./utils/cas.ts";
import { MongoClient, type Collection, type MongoClientOptions } from "mongodb";

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
}

const DRIVER_NAME = "mongodb";

// SHA-1 of the serialized value. Content-addressable; matches the redis driver.
const computeEtag = (value: unknown): string => {
  const buf = Buffer.from(typeof value === "string" ? value : JSON.stringify(value));
  return createHash("sha1").update(buf).digest("hex");
};

const isDuplicateKeyError = (err: unknown): boolean =>
  !!err && typeof err === "object" && (err as { code?: number }).code === 11_000;

const driver: DriverFactory<MongoDbOptions, Collection> = (opts) => {
  let collection: Collection;
  let indexReady: Promise<unknown> | undefined;
  const getMongoCollection = () => {
    if (!collection) {
      if (!opts.connectionString) {
        throw createRequiredError(DRIVER_NAME, "connectionString");
      }
      const mongoClient = new MongoClient(opts.connectionString, opts.clientOptions);
      const db = mongoClient.db(opts.databaseName || "unstorage");
      collection = db.collection(opts.collectionName || "unstorage");
      indexReady = collection.createIndex({ key: 1 }, { unique: true }).catch(() => {});
    }
    return collection;
  };

  const setWithCAS = async (
    key: string,
    value: unknown,
    tOptions: { ifMatch?: string; ifNoneMatch?: string },
  ): Promise<{ etag: string }> => {
    const col = getMongoCollection();
    await indexReady;
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
      const result = await getMongoCollection().findOne({ key });
      return !!result;
    },
    async getItem(key) {
      const document = await getMongoCollection().findOne({ key });
      return document?.value ?? null;
    },
    async getItems(items) {
      const keys = items.map((item) => item.key);

      const result = await getMongoCollection()
        .find({ key: { $in: keys } })
        .toArray();

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
      await getMongoCollection().updateOne(
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
      await getMongoCollection().bulkWrite(operations);
    },
    async removeItem(key) {
      await getMongoCollection().deleteOne({ key });
    },
    async getKeys() {
      return await getMongoCollection()
        .find()
        .project({ key: true })
        .map((d) => d.key)
        .toArray();
    },
    async getMeta(key) {
      const document = await getMongoCollection().findOne({ key });
      return document
        ? {
            mtime: document.modifiedAt,
            birthtime: document.createdAt,
            etag: document._etag,
          }
        : {};
    },
    async clear() {
      await getMongoCollection().deleteMany({});
    },
  };
};

export default driver;
