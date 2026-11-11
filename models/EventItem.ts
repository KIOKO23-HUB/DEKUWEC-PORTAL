import mongoose, { Schema, Document } from "mongoose";

export interface IEventItem extends Document {
  title: string;
  category: string;
  date: string;
  time?: string;
  location?: string;
  imageUrl?: string;
  galleryLink?: string;
  description: string;
  media?: any[];
  isFree?: boolean;
  ticketPrice?: number;
  paymentTiers?: { id: string; label: string; amount: number }[];
  // Custom marketing poster used to auto-generate personalised posters for applicants.
  // All geometry is stored as percentages of the template's width/height.
  posterTemplate?: {
    imageUrl: string;
    photo: { x: number; y: number; width: number; height: number };
    name: { x: number; y: number; size: number; color: string; align: "left" | "center" | "right" };
  };
  likes: string[]; // NEW: Stores Clerk User IDs
  comments: {
    clerkId: string;
    fullName: string;
    text: string;
    createdAt: Date;
  }[]; // NEW: Stores Comment Objects
  createdAt: Date;
}

const EventItemSchema = new Schema<IEventItem>({
  title: { type: String, required: true },
  category: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String },
  location: { type: String },
  imageUrl: { type: String },
  galleryLink: { type: String },
  description: { type: String, required: true },
  media: { type: Array, default: [] },
  isFree: { type: Boolean, default: false },
  ticketPrice: { type: Number, default: 0 },
  paymentTiers: {
    type: [{ id: String, label: String, amount: Number }],
    default: [],
  },
  posterTemplate: {
    imageUrl: String,
    photo: { x: Number, y: Number, width: Number, height: Number },
    name: { x: Number, y: Number, size: Number, color: String, align: String },
  },
  
  // NEW FIELDS FOR INTERACTION
  likes: { type: [String], default: [] },
  comments: [{
    clerkId: String,
    fullName: String,
    text: String,
    createdAt: { type: Date, default: Date.now }
  }],
  
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.EventItem || mongoose.model<IEventItem>("EventItem", EventItemSchema);
