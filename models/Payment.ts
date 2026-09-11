import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema({
  clerkId: { type: String, required: true },
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  amount: { type: Number, required: true },
  category: { type: String, required: true }, // "Event", "WCK", or "Membership"
  reference: { type: String, required: true }, // e.g., "Mt Satima Hike"
  mpesaReceipt: { type: String, default: "" },
  status: { type: String, default: "Pending" }, // Pending, Completed, Failed
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);
