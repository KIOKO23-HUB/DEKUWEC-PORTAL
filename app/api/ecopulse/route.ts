import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import EcoPulse from "@/models/EcoPulse";

export async function GET() {
  try {
    await connectToDatabase();
    const posts = await EcoPulse.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ posts }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();
    const post = await EcoPulse.create(body);
    return NextResponse.json({ message: "Created", post }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { id, ...updateData } = await req.json();
    await connectToDatabase();
    const updated = await EcoPulse.findByIdAndUpdate(id, updateData, { new: true });
    return NextResponse.json({ message: "Updated", post: updated }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    await connectToDatabase();
    await EcoPulse.findByIdAndDelete(id);
    return NextResponse.json({ message: "Deleted" }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
