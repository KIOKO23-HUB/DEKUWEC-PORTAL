import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import EventRegistration from "@/models/EventRegistration";
import WckApplication from "@/models/WckApplication";
import CommunitySnap from "@/models/CommunitySnap";
import Member from "@/models/Member";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const clerkId = searchParams.get("clerkId");
    
    if (!clerkId) return NextResponse.json({ error: "Missing User ID" }, { status: 400 });

    await connectToDatabase();

    // Fetch all user activity simultaneously for maximum speed
    const [rsvps, wck, snaps, memberStatus] = await Promise.all([
      EventRegistration.find({ clerkId }).sort({ createdAt: -1 }),
      WckApplication.findOne({ clerkId }),
      CommunitySnap.find({ clerkId }).sort({ createdAt: -1 }),
      Member.findOne({ clerkId })
    ]);

    return NextResponse.json({ rsvps, wck, snaps, memberStatus }, { status: 200 });
  } catch (error) {
    console.error("Activity Fetch Error:", error);
    return NextResponse.json({ error: "Failed to load activity data" }, { status: 500 });
  }
}
