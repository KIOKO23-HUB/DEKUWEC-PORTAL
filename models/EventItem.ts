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
