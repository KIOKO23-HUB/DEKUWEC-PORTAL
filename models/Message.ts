import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  receiverId: { type: String, required: true },
  receiverName: { type: String, required: true },
  content: { type: String, required: true },
  isRead: { type: Boolean, default: false }, // <-- Added to track if the chat was read
}, { timestamps: true });

export default mongoose.models.Message || mongoose.model("Message", MessageSchema);
