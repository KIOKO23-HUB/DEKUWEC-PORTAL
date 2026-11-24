import mongoose from "mongoose";

const CommunitySnapSchema = new mongoose.Schema({
  clerkId: { type: String, required: true },
  fullName: { type: String, required: true },
  userProfilePic: { type: String, default: "" },
  imageUrl: { type: String, default: "" },
  videoUrl: { type: String, default: "" },
  mediaType: { type: String, enum: ["image", "video"], default: "image" },
  caption: { type: String, default: "" },
  likes: { type: [String], default: [] }, // Array of user Clerk IDs
  dislikes: { type: [String], default: [] }, // Array of user Clerk IDs
  reposts: { type: [String], default: [] },
  comments: [{
    clerkId: { type: String, required: true },
    fullName: { type: String, required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  }],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.CommunitySnap || mongoose.model("CommunitySnap", CommunitySnapSchema);
