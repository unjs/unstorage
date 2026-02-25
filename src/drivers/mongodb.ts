import { createRequiredError, type DriverFactory } from "./utils/index.ts";
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

const driver: DriverFactory<MongoDbOptions, Collection> = (opts) => {
  let collection: Collection;
  const getMongoCollection = () => {
    if (!collection) {
      if (!opts.connectionString) {
        throw createRequiredError(DRIVER_NAME, "connectionString");
      }
      const mongoClient = new MongoClient(
        opts.connectionString,
        opts.clientOptions
      );
      const db = mongoClient.db(opts.databaseName || "unstorage");
      collection = db.collection(opts.collectionName || "unstorage");
    }
    return collection;
  };

  return {
    name: DRIVER_NAME,
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
    async setItem(key, value) {
      const currentDateTime = new Date();
      await getMongoCollection().updateOne(
        { key },
        {
          $set: { key, value, modifiedAt: currentDateTime },
          $setOnInsert: { createdAt: currentDateTime },
        },
        { upsert: true }
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
          }
        : {};
    },
    async clear() {
      await getMongoCollection().deleteMany({});
    },
  };
};

export default driver;
