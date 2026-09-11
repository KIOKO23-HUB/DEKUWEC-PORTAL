import mongoose from "mongoose";

const WckApplicationSchema = new mongoose.Schema(
  {
    clerkId: { type: String, required: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    yearOfStudy: { type: String, required: true },
    ageBracket: { type: String, required: true },
    
    // M-Pesa Payment Tracking Fields
    paymentStatus: { type: String, default: "Not Yet Paid" }, 
    amountPaid: { type: Number, default: 0 },
    mpesaReceipt: { type: String, default: "" },
    
    // Application Processing Status
    status: { type: String, default: "Pending Payment" }, 
  },
  { timestamps: true }
);

// Fallback to prevent OverwriteModelError during hot reloads
const WckApplication = mongoose.models.WckApplication || mongoose.model("WckApplication", WckApplicationSchema);

export default WckApplication;