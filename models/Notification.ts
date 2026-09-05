import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    clerkId: { type: String, required: true }, // The user receiving the notification
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, default: "general" }, // e.g., 'application', 'event', 'admin'
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Notification = mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);

export default Notification;
