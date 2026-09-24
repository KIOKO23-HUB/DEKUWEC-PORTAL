import mongoose from "mongoose";

const PaymentConfigSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "default" },
    member: { type: Number, default: 100, min: 0 },
    wckUnder23: { type: Number, default: 100, min: 0 },
    wckOver23: { type: Number, default: 230, min: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.PaymentConfig || mongoose.model("PaymentConfig", PaymentConfigSchema);