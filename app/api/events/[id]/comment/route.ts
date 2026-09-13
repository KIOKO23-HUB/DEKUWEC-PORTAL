import { NextResponse } from "next/server";
import connectToDB from "@/lib/mongodb"; // <-- Removed curly braces here
import EventItem from "@/models/EventItem";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDB();
    const comment = await req.json();
    const { id } = params;

    const event = await EventItem.findById(id);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    event.comments.push(comment);
    await event.save();

    return NextResponse.json({ success: true, comments: event.comments });
  } catch (error) {
    return NextResponse.json({ error: "Failed to post comment" }, { status: 500 });
  }
}
