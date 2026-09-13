import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import EventItem from "@/models/EventItem";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const { eventId, clerkId, action, commentData } = await req.json();

    if (!eventId || !clerkId || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let updatedEvent;

    // Use MongoDB specific operators to push/pull data instantly
    if (action === "like") {
      updatedEvent = await EventItem.findByIdAndUpdate(
        eventId,
        { $addToSet: { likes: clerkId } }, // $addToSet prevents duplicate likes
        { new: true }
      );
    } else if (action === "unlike") {
      updatedEvent = await EventItem.findByIdAndUpdate(
        eventId,
        { $pull: { likes: clerkId } }, // Removes the like
        { new: true }
      );
    } else if (action === "comment" && commentData) {
      updatedEvent = await EventItem.findByIdAndUpdate(
        eventId,
        { $push: { comments: { ...commentData, createdAt: new Date() } } },
        { new: true }
      );
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true, event: updatedEvent }, { status: 200 });
  } catch (error) {
    console.error("Event interaction error:", error);
    return NextResponse.json({ error: "Failed to interact with event" }, { status: 500 });
  }
}
