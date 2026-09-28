import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  receiverId: { type: String, required: true },
  receiverName: { type: String, required: true },
  content: { type: String, default: "", maxlength: 2000 },
  mediaUrl: { type: String, default: "" },
  mediaType: { type: String, enum: ["image", "video", ""], default: "" },
  viewOnce: { type: Boolean, default: false },
  viewedAt: { type: Date, default: null },
  messageType: { type: String, enum: ["message", "system", "sticker"], default: "message" },
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

MessageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
MessageSchema.index({ receiverId: 1, senderId: 1, createdAt: -1 });

export default mongoose.models.Message || mongoose.model("Message", MessageSchema);
