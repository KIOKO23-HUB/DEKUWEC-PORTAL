import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { clerkClient } from "@clerk/nextjs/server";
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

    // Fetch local database collections
    const [
      pendingMembers,
      localMembersDb,
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

    // Fetch the MASTER user list directly from Clerk with a limit of 500 (bypassing the default limit of 10)
    const client = await clerkClient();
    const clerkUsers = await client.users.getUserList({ limit: 500 });

    // Map local MongoDB members for quick lookup
    const localMembersMap = new Map();
    localMembersDb.forEach(m => localMembersMap.set(m.clerkId, m));

    // Merge Clerk Auth accounts with local MongoDB data
    const allMembers = clerkUsers.data.map(user => {
      const localData = localMembersMap.get(user.id);
      
      return {
        _id: user.id, // Force _id to be the Clerk ID so the frontend passes it to the DELETE/PUT routes
        clerkId: user.id,
        fullName: localData?.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || "Member",
        email: user.emailAddresses[0]?.emailAddress || localData?.email || "No Email",
        course: localData?.course || "General",
        status: localData?.status || "Unregistered"
      };
    });

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
