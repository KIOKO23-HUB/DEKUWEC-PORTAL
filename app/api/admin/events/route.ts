import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import EventItem from "@/models/EventItem";

export async function GET() {
  try {
    await connectToDatabase();
    const events = await EventItem.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ events }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch events" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();
    const newEvent = await EventItem.create(body);
    return NextResponse.json({ success: true, event: newEvent }, { status: 201 });
  } catch (error: any) {
    console.error("Admin Event Post Error:", error);
    return NextResponse.json({ error: error.message || "Failed to post event" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { id, ...updateData } = await req.json();
    await connectToDatabase();
    const updatedEvent = await EventItem.findByIdAndUpdate(id, updateData, { new: true });
    return NextResponse.json({ success: true, event: updatedEvent }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Update Failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    await connectToDatabase();
    await EventItem.findByIdAndDelete(id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Delete Failed" }, { status: 500 });
  }
}
