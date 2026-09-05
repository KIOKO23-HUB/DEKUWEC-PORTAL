import mongoose from "mongoose";

const PortalStatSchema = new mongoose.Schema({
  type: { type: String, required: true, unique: true }, // e.g., 'likes'
  count: { type: Number, default: 20 } // Starts at 20 as requested
});

const PortalStat = mongoose.models.PortalStat || mongoose.model("PortalStat", PortalStatSchema);

export default PortalStat;
