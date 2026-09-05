import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import EventItem from "@/models/EventItem";

export async function GET() {
  try {
    await connectToDatabase();
    const events = await EventItem.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ events }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();
    const event = await EventItem.create(body);
    return NextResponse.json({ message: "Event created", event }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { id, ...updateData } = await req.json();
    await connectToDatabase();
    const updated = await EventItem.findByIdAndUpdate(id, updateData, { new: true });
    return NextResponse.json({ message: "Event updated", event: updated }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    await connectToDatabase();
    await EventItem.findByIdAndDelete(id);
    return NextResponse.json({ message: "Event deleted" }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}
