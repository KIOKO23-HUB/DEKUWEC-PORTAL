import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import CommunitySnap from "@/models/CommunitySnap";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectToDatabase();
    const snaps = await CommunitySnap.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ snaps }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch community snaps" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { clerkId, fullName, userProfilePic, imageUrl, caption } = await req.json();
    await connectToDatabase();
    
    const newSnap = new CommunitySnap({ clerkId, fullName, userProfilePic, imageUrl, caption });
    await newSnap.save();

    return NextResponse.json({ message: "Snap uploaded successfully", snap: newSnap }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to upload snap" }, { status: 500 });
  }
}

// NEW: Allows users to securely delete their own uploads
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const clerkId = searchParams.get("clerkId"); 

    if (!id || !clerkId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    await connectToDatabase();

    // The query specifically matches BOTH the snap ID and the original uploader's Clerk ID.
    // If someone else tries to delete it, the query will safely fail and return null.
    const deletedSnap = await CommunitySnap.findOneAndDelete({ _id: id, clerkId: clerkId });

    if (!deletedSnap) {
      return NextResponse.json({ error: "Unauthorized or snap not found" }, { status: 403 });
    }

    return NextResponse.json({ message: "Snap deleted successfully" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete snap" }, { status: 500 });
  }
}
