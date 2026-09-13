import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongodb";
import EventItem from "@/models/EventItem"; // <-- Corrected import

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDB();
    const { userId } = await req.json();
    const { id } = params;

    // Use EventItem instead of Event
    const event = await EventItem.findById(id);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    // Check if user already liked it
    const hasLiked = event.likes.includes(userId);

    if (hasLiked) {
      // Unlike
      event.likes = event.likes.filter((id: string) => id !== userId);
    } else {
      // Like
      event.likes.push(userId);
    }

    await event.save();
    return NextResponse.json({ success: true, likes: event.likes });
  } catch (error) {
    return NextResponse.json({ error: "Failed to like event" }, { status: 500 });
  }
}
