import mongoose from "mongoose";

const MemberSchema = new mongoose.Schema(
  {
    clerkId: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String }, // Optional for claims, required for new registrations
    yearOfStudy: { type: String },
    status: { type: String, default: "Pending Approval" },
    isOfficialRosterClaim: { type: Boolean, default: false },
    claimedRosterName: { type: String },
  },
  { timestamps: true }
);

// Fallback to prevent OverwriteModelError during hot reloads
const Member = mongoose.models.Member || mongoose.model("Member", MemberSchema);

export default Member;
