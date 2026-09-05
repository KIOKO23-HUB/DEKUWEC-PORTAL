import mongoose from "mongoose";

const EventRegistrationSchema = new mongoose.Schema(
  {
    clerkId: { type: String, required: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    eventName: { type: String, required: true },
    status: { type: String, default: "Registered" },
  },
  { timestamps: true }
);

// Fallback for Next.js hot reloads
const EventRegistration = mongoose.models.EventRegistration || mongoose.model("EventRegistration", EventRegistrationSchema);

export default EventRegistration;
