import mongoose from "mongoose";

const InquirySchema = new mongoose.Schema(
  {
    clerkId: { type: String, required: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, default: "Pending Review" },
  },
  { timestamps: true }
);

// Fallback for Next.js hot reloads
const Inquiry = mongoose.models.Inquiry || mongoose.model("Inquiry", InquirySchema);

export default Inquiry;
