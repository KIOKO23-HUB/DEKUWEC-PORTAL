import mongoose from "mongoose";

const EventItemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { 
    type: String, 
    enum: ["upcoming", "previous", "project"], 
    default: "upcoming" 
  },
  date: { type: String, required: true },
  time: { type: String, default: "" },
  location: { type: String, default: "" },
  description: { type: String, required: true },
  imageUrl: { type: String, default: "" },
  galleryLink: { type: String, default: "" },
  status: { type: String, default: "Registration Open" },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.EventItem || mongoose.model("EventItem", EventItemSchema);
