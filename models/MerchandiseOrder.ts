import mongoose, { Schema, Document } from "mongoose";

export interface IMerchandiseOrder extends Document {
  clerkId: string;
  fullName: string;
  email: string;
  phone: string;
  merchandiseId: string;
  merchandiseTitle: string;
  imageUrl: string;
  amount: number;
  size?: string;
  customName?: string;
  paymentStatus: "Pending" | "Paid" | "Pay Later";
  collectionStatus: "Processing" | "Ready for Pickup" | "Collected";
  pickupNote: string;
  mpesaReceipt?: string;
  createdAt: Date;
}

const MerchandiseOrderSchema = new Schema<IMerchandiseOrder>({
  clerkId: { type: String, required: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  merchandiseId: { type: String, required: true },
  merchandiseTitle: { type: String, required: true },
  imageUrl: { type: String, required: true },
  amount: { type: Number, required: true },
  size: { type: String, default: "M" },
  customName: { type: String, default: "" },
  paymentStatus: { type: String, default: "Pending" },
  collectionStatus: { type: String, default: "Processing" },
  pickupNote: { type: String, default: "Collection at the weekly Wednesday physical gathering after 1 week." },
  mpesaReceipt: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.MerchandiseOrder || mongoose.model<IMerchandiseOrder>("MerchandiseOrder", MerchandiseOrderSchema);