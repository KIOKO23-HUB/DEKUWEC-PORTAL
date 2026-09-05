import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Leader from "@/models/Leader";

export async function GET() {
  try {
    await connectToDatabase();
    const leaders = await Leader.find({}).sort({ order: 1, createdAt: 1 });
    return NextResponse.json({ leaders }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to fetch leaders" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();
    const leader = await Leader.create(body);
    return NextResponse.json({ message: "Leader created", leader }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create leader" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { id, ...updateData } = await req.json();
    await connectToDatabase();
    const updated = await Leader.findByIdAndUpdate(id, updateData, { new: true });
    return NextResponse.json({ message: "Leader updated", leader: updated }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to update leader" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    await connectToDatabase();
    await Leader.findByIdAndDelete(id);
    return NextResponse.json({ message: "Leader deleted" }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to delete leader" }, { status: 500 });
  }
}
