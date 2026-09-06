import mongoose from "mongoose";

const LeaderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, required: true },
  phone: { type: String, default: "" },
  bio: { type: String, default: "" },
  imageUrl: { type: String, default: "" },
  order: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Leader || mongoose.model("Leader", LeaderSchema)