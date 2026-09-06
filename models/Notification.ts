import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    clerkId: { type: String, required: true }, 
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, default: "general" }, 
    link: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);
