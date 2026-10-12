import mongoose from "mongoose";

// Official executive positions open for the 2026/2027 leadership elections
export const LEADERSHIP_ROLES = [
  "Chairperson",
  "Vice Chairperson",
  "Secretary",
  "Organizing Secretary",
  "Treasurer",
  "Information Director",
  "Public Representative (PR)",
  "Social Media Director",
  "ICT Manager",
  "First Year Representative",
];

export const LEADERSHIP_REQUIREMENTS = [
  "Registered DEKUWEC member for the 2025/2026 membership year",
  "Attendance of club meetings on a regular basis",
  "Participation in at least 2 club activities per semester",
  "A continuing student at Dedan Kimathi University of Technology",
  "Good public address and communication skills",
];

const LeadershipApplicationSchema = new mongoose.Schema(
  {
    clerkId: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    regNo: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, required: true },

    // Motivation & manifesto
    motivation: { type: String, required: true },
    newIdeas: { type: String, required: true },

    // Previous leadership experience
    heldPositionBefore: { type: Boolean, default: false },
    previousRole: { type: String, default: "" },

    // Applicant confirmed they meet every published requirement
    confirmedRequirements: { type: Boolean, default: false },

    // Automatic cross-check against the membership register
    isRegisteredMember: { type: Boolean, default: false },
    memberStatus: { type: String, default: "Unverified" },

    // Processing status
    status: { type: String, enum: ["Pending Review", "Approved", "Rejected"], default: "Pending Review" },
    reviewNote: { type: String, default: "" },
    reviewedAt: { type: Date, default: null },

    // Online impressions (official voting is physical on election day)
    impressions: { type: Number, default: 0 },
    impressedBy: { type: [String], default: [] },
  },
  { timestamps: true }
);

const LeadershipApplication =
  mongoose.models.LeadershipApplication ||
  mongoose.model("LeadershipApplication", LeadershipApplicationSchema);

export default LeadershipApplication;
