import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Member from "@/models/Member";

export async function PUT(req: Request) {
  try {
    const { id, fullName, email, course, status } = await req.json();
    await connectToDatabase();
    const updated = await Member.findByIdAndUpdate(
      id, 
      { fullName, email, course, status }, 
      { new: true }
    );
    return NextResponse.json({ message: "Member updated", member: updated }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    await connectToDatabase();
    await Member.findByIdAndDelete(id);
    return NextResponse.json({ message: "Member deleted" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete member" }, { status: 500 });
  }
}
