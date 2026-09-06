import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Member from "@/models/Member";
import WckApplication from "@/models/WckApplication";
import EventItem from "@/models/EventItem";
import EventRegistration from "@/models/EventRegistration";
import EcoPulse from "@/models/EcoPulse";
import NatureSnap from "@/models/NatureSnap";
import Leader from "@/models/Leader";
import Inquiry from "@/models/Inquiry";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectToDatabase();

    const [
      pendingMembers,
      allMembers,
      wckApplicants,
      events,
      eventRegistrations,
      ecoPulsePosts,
      snaps,
      leaders,
      feedbacks
    ] = await Promise.all([
      Member.find({ status: { $in: ["Pending Approval", "Pending"] } }).sort({ updatedAt: -1 }),
      Member.find({}).sort({ updatedAt: -1 }),
      WckApplication.find({}).sort({ createdAt: -1 }),
      EventItem.find({}).sort({ createdAt: -1 }),
      EventRegistration.find({}).sort({ createdAt: -1 }),
      EcoPulse.find({}).sort({ createdAt: -1 }),
      NatureSnap.find({}).sort({ createdAt: -1 }),
      Leader.find({}).sort({ order: 1, createdAt: 1 }),
      Inquiry.find({}).sort({ createdAt: -1 })
    ]);

    return NextResponse.json({
      pendingMembers,
      allMembers,
      wckApplicants,
      events,
      eventRegistrations,
      ecoPulsePosts,
      snaps,
      leaders,
      feedbacks
    }, { status: 200 });
  } catch (error: any) {
    console.error("Master Admin Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
