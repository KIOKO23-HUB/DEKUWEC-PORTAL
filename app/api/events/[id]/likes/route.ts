import { NextResponse } from "next/server";
import connectToDB from "@/lib/mongodb"; // <-- Removed curly braces here
import EventItem from "@/models/EventItem";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDB();
    const { userId } = await req.json();
    const { id } = params;

    const event = await EventItem.findById(id);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const hasLiked = event.likes.includes(userId);

    if (hasLiked) {
      event.likes = event.likes.filter((id: string) => id !== userId);
    } else {
      event.likes.push(userId);
    }

    await event.save();
    return NextResponse.json({ success: true, likes: event.likes });
  } catch (error) {
    return NextResponse.json({ error: "Failed to like event" }, { status: 500 });
  }
}