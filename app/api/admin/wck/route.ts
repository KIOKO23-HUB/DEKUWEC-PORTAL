import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import WckApplication from "@/models/WckApplication";

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    await connectToDatabase();
    await WckApplication.findByIdAndDelete(id);
    return NextResponse.json({ message: "WCK Application deleted" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete application" }, { status: 500 });
  }
}
