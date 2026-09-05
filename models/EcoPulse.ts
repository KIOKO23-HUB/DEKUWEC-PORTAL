import mongoose from "mongoose";

const OptionSchema = new mongoose.Schema({
  id: { type: String, required: true }, // "A", "B", "C", "D"
  text: { type: String, required: true }
}, { _id: false });

const EcoPulseSchema = new mongoose.Schema({
  type: { type: String, enum: ["topic", "quiz"], required: true },
  title: { type: String, required: true },
  content: { type: String, required: true }, // Explanation or Article Body
  category: { type: String, default: "Conservation" },
  imageUrl: { type: String, default: "" },
  link: { type: String, default: "" },
  // Specific fields for Quiz type
  options: { type: [OptionSchema], default: [] },
  correctAnswer: { type: String, default: "A" },
  date: { 
    type: String, 
    default: () => new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }) 
  },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.EcoPulse || mongoose.model("EcoPulse", EcoPulseSchema);
