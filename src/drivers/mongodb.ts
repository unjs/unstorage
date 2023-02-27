import { defineDriver } from "./utils";
import { Collection, MongoClient } from "mongodb";

export interface MongoDbOptions {
  /**
   * The MongoDB connection string.
   */
  connectionString: string;

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

export default defineDriver((opts: MongoDbOptions) => {
  let collection: Collection;
  const getMongoCollection = () => {
    if (!collection) {
      if (!opts.connectionString) {
        throw new Error(
          "[unstorage] MongoDB driver requires a connection string to be provided."
        );
      }
      const mongoClient = new MongoClient(opts.connectionString);
      const db = mongoClient.db(opts.databaseName || "unstorage");
      collection = db.collection(opts.collectionName || "unstorage");
    }
    return collection;
  };

  return {
    async hasItem(key) {
      const result = await getMongoCollection().findOne({ key });
      return !!result;
    },
    async getItem(key) {
      const document = await getMongoCollection().findOne({ key });
      return document?.value ? document.value : null;
    },
    async setItem(key, value) {
      const currentDateTime = new Date();
      await getMongoCollection().findOneAndUpdate(
        { key },
        {
          $set: { key, value, modifiedAt: currentDateTime },
          $setOnInsert: { createdAt: currentDateTime },
        },
        { upsert: true, returnDocument: "after" }
      );
      return;
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
      return {
        mtime: document.modifiedAt,
        birthtime: document.createdAt,
      };
    },
    async clear() {
      await getMongoCollection().deleteMany({});
    },
  };
});
