import mongoose from "mongoose";

const EventRegistrationSchema = new mongoose.Schema({
  clerkId: { type: String },
  fullName: { type: String },
  email: { type: String },
  phone: { type: String },
  phoneNumber: { type: String }, 
  registrationNumber: { type: String },
  eventName: { type: String },
  paymentStatus: { type: String, default: "Not Yet Paid" }, 
  amountPaid: { type: Number, default: 0 },
}, { timestamps: true, strict: false }); 

const EventRegistration = mongoose.models.EventRegistration || mongoose.model("EventRegistration", EventRegistrationSchema);

export default EventRegistration;