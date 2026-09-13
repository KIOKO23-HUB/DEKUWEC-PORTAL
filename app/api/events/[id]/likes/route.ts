import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import EventItem from "@/models/EventItem";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const { userId } = await req.json();
    const { id } = params;

    const event = await EventItem.findById(id);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const hasLiked = event.likes.includes(userId);
    let updatedEvent;

    if (hasLiked) {
      // Use $pull to safely remove the exact user ID
      updatedEvent = await EventItem.findByIdAndUpdate(
        id,
        { $pull: { likes: userId } },
        { new: true }
      );
    } else {
      // Use $addToSet to add the user ID (prevents accidental duplicates)
      updatedEvent = await EventItem.findByIdAndUpdate(
        id,
        { $addToSet: { likes: userId } },
        { new: true }
      );
    }

    return NextResponse.json({ success: true, likes: updatedEvent?.likes || [] });
  } catch (error) {
    console.error("Like POST Error:", error);
    return NextResponse.json({ error: "Failed to like event" }, { status: 500 });
  }
}
