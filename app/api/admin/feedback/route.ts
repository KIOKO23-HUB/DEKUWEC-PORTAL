import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Inquiry from "@/models/Inquiry";

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    await connectToDatabase();
    await Inquiry.findByIdAndDelete(id);
    return NextResponse.json({ message: "Feedback deleted" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete feedback" }, { status: 500 });
  }
}
