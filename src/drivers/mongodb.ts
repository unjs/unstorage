import {
  createRequiredError,
  type DriverFactory,
  importLib,
  type LibImport,
  type DriverDependencies,
} from "./utils/index.ts";
import type { Collection, MongoClientOptions } from "mongodb";

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

const driver: DriverFactory<MongoDbOptions, Promise<Collection>> = (opts) => {
  let collection: Promise<Collection> | undefined;
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
      const mongoClient = new MongoClient(opts.connectionString, opts.clientOptions);
      const db = mongoClient.db(opts.databaseName || "unstorage");
      return db.collection(opts.collectionName || "unstorage");
    })());

  return {
    name: DRIVER_NAME,
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
    async setItem(key, value) {
      const currentDateTime = new Date();
      await (
        await getMongoCollection()
      ).updateOne(
        { key },
        {
          $set: { key, value, modifiedAt: currentDateTime },
          $setOnInsert: { createdAt: currentDateTime },
        },
        { upsert: true },
      );
    },
    async setItems(items) {
      const currentDateTime = new Date();
      const operations = items.map(({ key, value }) => ({
        updateOne: {
          filter: { key },
          update: {
            $set: { key, value, modifiedAt: currentDateTime },
            $setOnInsert: { createdAt: currentDateTime },
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
          }
        : {};
    },
    async clear() {
      await (await getMongoCollection()).deleteMany({});
    },
  };
};

export default driver;
