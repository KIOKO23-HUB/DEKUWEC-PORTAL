import mongoose, { Schema, Document } from "mongoose";

export interface IAdminLog extends Document {
  clerkId: string;
  name: string;
  email: string;
  role: string;
  lastActive: Date;
  accessCount: number;
}

const AdminLogSchema = new Schema<IAdminLog>({
  clerkId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, default: "Executive Admin" },
  lastActive: { type: Date, default: Date.now },
  accessCount: { type: Number, default: 1 }
}, { timestamps: true });

export default mongoose.models.AdminLog || mongoose.model<IAdminLog>("AdminLog", AdminLogSchema);
