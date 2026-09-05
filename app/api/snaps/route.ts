import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import NatureSnap from "@/models/NatureSnap";

export async function GET() {
  try {
    await connectToDatabase();
    const snaps = await NatureSnap.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ snaps }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to fetch snaps" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();
    const snap = await NatureSnap.create(body);
    return NextResponse.json({ message: "Snap created", snap }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create snap" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { id, ...updateData } = await req.json();
    await connectToDatabase();
    const updated = await NatureSnap.findByIdAndUpdate(id, updateData, { new: true });
    return NextResponse.json({ message: "Snap updated", snap: updated }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to update snap" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    await connectToDatabase();
    await NatureSnap.findByIdAndDelete(id);
    return NextResponse.json({ message: "Snap deleted" }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to delete snap" }, { status: 500 });
  }
}
