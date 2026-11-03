import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

if (!uri || !dbName) {
  throw new Error("MongoDB environment variables are not configured");
}

const options = {
  serverSelectionTimeoutMS: 5000,
};

let client;
let clientPromise;

if (process.env.NODE_ENV === "development") {
  if (!globalThis.mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalThis.mongoClientPromise = client.connect();
  }

  clientPromise = globalThis.mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export async function getMongoDb() {
  const connectedClient = await clientPromise;
  return connectedClient.db(dbName);
}

export async function testMongoConnection() {
  const db = await getMongoDb();
  return db.command({ ping: 1 });
}

export default clientPromise;
