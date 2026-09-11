import mongoose from "mongoose";

const CommunitySnapSchema = new mongoose.Schema({
  clerkId: { type: String, required: true },
  fullName: { type: String, required: true },
  userProfilePic: { type: String, default: "" },
  imageUrl: { type: String, required: true },
  caption: { type: String, default: "" },
  likes: { type: [String], default: [] }, // Array of user Clerk IDs
  dislikes: { type: [String], default: [] }, // Array of user Clerk IDs
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.CommunitySnap || mongoose.model("CommunitySnap", CommunitySnapSchema);
