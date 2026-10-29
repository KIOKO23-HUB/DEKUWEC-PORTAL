import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
}

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

// 1. Export as 'connectToDatabase' for your admin routes
export const connectToDatabase = async () => {
  if (cached.conn) {
    return cached.conn;
  }
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 8000,
        socketTimeoutMS: 20000,
        maxPoolSize: 5,
        bufferCommands: false,
      })
      .catch((err: unknown) => {
        // Never leave a rejected promise cached: the next request must be able to retry.
        cached.promise = null;
        throw err;
      });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

// 2. Export as 'connectMongoDB' for your directory routes
export const connectMongoDB = connectToDatabase;

// 3. Default export for your clerk webhook route
export default connectToDatabase;
