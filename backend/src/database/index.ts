import mongoose from "mongoose";

export async function connectDatabase(): Promise<void> {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/chatio";

  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB database successfully.");
  } catch (err: any) {
    console.error("Failed to connect to MongoDB database:", err.message);
    process.exit(1);
  }
}
