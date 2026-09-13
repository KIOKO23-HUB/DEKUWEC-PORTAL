import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb"; 
import EventItem from "@/models/EventItem";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const comment = await req.json();
    const { id } = params;

    // Use $push to inject the comment directly into the database safely
    const updatedEvent = await EventItem.findByIdAndUpdate(
      id,
      { $push: { comments: { ...comment, createdAt: new Date() } } },
      { new: true }
    );

    if (!updatedEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, comments: updatedEvent.comments });
  } catch (error) {
    console.error("Comment POST Error:", error);
    return NextResponse.json({ error: "Failed to post comment" }, { status: 500 });
  }
}
