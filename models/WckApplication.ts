import mongoose from "mongoose";

const WckApplicationSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    yearOfStudy: { type: String, required: true },
    ageBracket: { type: String, required: true },
    status: { type: String, default: "Pending Payment" },
  },
  { timestamps: true }
);

// Fallback to prevent OverwriteModelError during hot reloads
const WckApplication = mongoose.models.WckApplication || mongoose.model("WckApplication", WckApplicationSchema);

export default WckApplication;
