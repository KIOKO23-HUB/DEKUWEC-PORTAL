import mongoose, { Schema, Document } from "mongoose";

export interface IMerchandise extends Document {
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  category: "tshirt" | "hoodie" | "cap" | "badge" | "other";
  allowCustomName: boolean;
  availableSizes: string[];
  inStock: boolean;
  createdAt: Date;
}

const MerchandiseSchema = new Schema<IMerchandise>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  imageUrl: { type: String, required: true },
  category: { type: String, default: "tshirt" },
  allowCustomName: { type: Boolean, default: false },
  availableSizes: { type: [String], default: ["S", "M", "L", "XL"] },
  inStock: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Merchandise || mongoose.model<IMerchandise>("Merchandise", MerchandiseSchema);