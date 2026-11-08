import mongoose from "mongoose";

const MemberSchema = new mongoose.Schema(
  {
    clerkId: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    displayName: { type: String, default: "" },
    email: { type: String, required: true },
    phone: { type: String }, // Optional for claims, required for new registrations
    course: { type: String, default: "" },
    year: { type: String, default: "Year 1" },
    photoURL: { type: String, default: "" },
    yearOfStudy: { type: String },
    status: { type: String, default: "Pending Approval" },
    isOfficialRosterClaim: { type: Boolean, default: false },
    claimedRosterName: { type: String },
    paymentStatus: { type: String, default: "Not Yet Paid" },
    amountPaid: { type: Number, default: 0 },
    mpesaReceipt: { type: String, default: "" },
  },
  { timestamps: true }
);

// Fallback to prevent OverwriteModelError during hot reloads
const Member = mongoose.models.Member || mongoose.model("Member", MemberSchema);

export default Member;
