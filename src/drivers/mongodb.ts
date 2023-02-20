import { defineDriver } from "./utils";
import { Collection, MongoClient } from "mongodb";

export interface MongoDbOptions {
  /**
   * The MongoDB connection string.
   */
  connectionString?: string;
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

export default defineDriver((opts: MongoDbOptions = {}) => {
  const {
    connectionString,
    databaseName = "unstorage",
    collectionName = "unstorage",
  } = opts;
  if (!connectionString)
    throw new Error(
      "MongoDB driver requires a connection string to be provided."
    );
  let client: Collection;
  const getMongoDbClient = () => {
    if (!client) {
      const mongoClient = new MongoClient(connectionString);
      const db = mongoClient.db(databaseName);
      client = db.collection(collectionName);
    }
    return client;
  };

  return {
    async hasItem(key) {
      const result = await getMongoDbClient().findOne({ key });
      return !!result;
    },
    async getItem(key) {
      const document = await getMongoDbClient().findOne({ key });
      return document?.value ? document.value : null;
    },
    async setItem(key, value) {
      const currentDateTime = new Date();
      const [modified, created] = [currentDateTime, currentDateTime];
      await getMongoDbClient().findOneAndUpdate(
        { key },
        { $set: { key, value, modified }, $setOnInsert: { created } },
        { upsert: true, returnDocument: "after" }
      );
      return;
    },
    async removeItem(key) {
      await getMongoDbClient().deleteOne({ key });
    },
    async getKeys() {
      const documents = await getMongoDbClient().find().toArray();
      const keys = [];
      documents.map((document) => keys.push(document.key));
      return keys;
    },
    async getMeta(key) {
      const document = await getMongoDbClient().findOne({ key });
      return {
        mtime: document.modified,
        birthtime: document.created,
      };
    },
    async clear() {
      await getMongoDbClient().deleteMany({});
    },
  };
});
