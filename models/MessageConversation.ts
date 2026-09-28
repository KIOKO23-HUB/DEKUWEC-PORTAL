import mongoose from "mongoose";

const MessageConversationSchema = new mongoose.Schema({
  participantKey: { type: String, required: true, unique: true },
  participants: { type: [String], required: true },
  activeWeek: { type: String, default: "" },
  activeWeekParticipants: { type: [String], default: [] },
  lastMutualWeek: { type: String, default: "" },
  streakWeeks: { type: Number, default: 0 },
  lastMessageAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.models.MessageConversation || mongoose.model("MessageConversation", MessageConversationSchema);