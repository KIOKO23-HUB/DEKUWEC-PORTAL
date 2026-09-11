import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import CommunitySnap from "@/models/CommunitySnap";

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const action = searchParams.get("action");

    await connectToDatabase();

    // Bulk Delete (Reset the week)
    if (action === "deleteAll") {
      await CommunitySnap.deleteMany({});
      return NextResponse.json({ message: "All submissions cleared for the new week." }, { status: 200 });
    }

    // Single Delete (Moderation)
    if (id) {
      await CommunitySnap.findByIdAndDelete(id);
      return NextResponse.json({ message: "Snap deleted successfully" }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
