import mongoose from "mongoose";

// Single configuration document that holds the election season timeline set by the admin
export const LEADERSHIP_SEASON = "2026/2027";

const LeadershipConfigSchema = new mongoose.Schema(
  {
    season: { type: String, default: LEADERSHIP_SEASON, unique: true },
    applicationsOpen: { type: Boolean, default: true },
    debateDate: { type: String, default: "" },
    campaignDate: { type: String, default: "" },
    electionDate: { type: String, default: "" },
    venue: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

const LeadershipConfig =
  mongoose.models.LeadershipConfig || mongoose.model("LeadershipConfig", LeadershipConfigSchema);

export default LeadershipConfig;
