import mongoose from "mongoose";

const MessagePresenceSchema = new mongoose.Schema({
  clerkId: { type: String, required: true, unique: true },
  lastSeenAt: { type: Date, required: true, default: Date.now },
  typingTo: { type: String, default: "" },
  typingUntil: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.models.MessagePresence || mongoose.model("MessagePresence", MessagePresenceSchema);