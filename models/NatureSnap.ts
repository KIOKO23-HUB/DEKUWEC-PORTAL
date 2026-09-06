import mongoose from "mongoose";

const NatureSnapSchema = new mongoose.Schema({
  title: { type: String, required: true },
  photographer: { type: String, required: true },
  description: { type: String, default: "" },
  imageUrl: { type: String, required: true },
  type: { 
    type: String, 
    enum: ["winner", "top_submission"], 
    default: "top_submission" 
  },
  date: { 
    type: String, 
    default: () => new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) 
  },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.NatureSnap || mongoose.model("NatureSnap", NatureSnapSchema)