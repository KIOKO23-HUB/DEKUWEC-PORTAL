import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    senderId: { type: String, required: true }, // Clerk ID of the person sending
    senderName: { type: String, required: true },
    receiverId: { type: String, required: true }, // Clerk ID of the person receiving
    receiverName: { type: String, required: true },
    content: { type: String, required: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Message = mongoose.models.Message || mongoose.model("Message", MessageSchema);

export default Message;
