import mongoose from "mongoose";

const MessagePresenceSchema = new mongoose.Schema({
  clerkId: { type: String, required: true, unique: true },
  lastSeenAt: { type: Date, required: true, default: Date.now },
}, { timestamps: true });

export default mongoose.models.MessagePresence || mongoose.model("MessagePresence", MessagePresenceSchema);