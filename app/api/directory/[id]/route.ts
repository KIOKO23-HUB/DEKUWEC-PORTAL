import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import Member from "@/models/Member";
import EventRegistration from "@/models/EventRegistration";
import CommunitySnap from "@/models/CommunitySnap";
import EventItem from "@/models/EventItem";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const { id } = params;

    // 1. Fetch user from Clerk
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(id);

    // 2. Fetch all related database records concurrently
    const [member, rsvps, snaps, allEvents] = await Promise.all([
      Member.findOne({ clerkId: id }),
      EventRegistration.find({ clerkId: id }).sort({ createdAt: -1 }),
      CommunitySnap.find({ clerkId: id }).sort({ createdAt: -1 }),
      EventItem.find({}) // Fetch all events so we can check if they are "upcoming" or "previous"
    ]);

    // 3. Process RSVPs to determine Attendance & Payment Status
    const enrichedRsvps = rsvps.map(rsvp => {
      // Find the actual event post to see its category
      const matchedEvent = allEvents.find(e => e.title === rsvp.eventName);
      const isUpcoming = matchedEvent ? matchedEvent.category === "upcoming" : true; 
      
      // Check payment status (Defaults to "Paid" if you haven't added this field to your DB yet)
      const paymentStatus = rsvp.paymentStatus || "Paid"; 
      
      let attendanceStatus = "";
      if (isUpcoming) {
         attendanceStatus = paymentStatus === "Partial" ? "Attending (Partially Paid)" : "Attending & Paid";
      } else {
         attendanceStatus = "Attended";
      }

      return {
         _id: rsvp._id.toString(),
         eventName: rsvp.eventName,
         createdAt: rsvp.createdAt,
         isUpcoming,
         attendanceStatus
      };
    });

    // 4. Assemble the final public profile
    const profile = {
      id: clerkUser.id,
      fullName: member?.fullName || `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || "Member",
      imageUrl: clerkUser.imageUrl,
      course: member?.course || "General",
      year: member?.year || member?.yearOfStudy || "N/A",
      status: member?.status || "Unregistered",
      rsvps: enrichedRsvps,
      snaps: snaps
    };

    return NextResponse.json({ profile }, { status: 200 });
  } catch (error) {
    console.error("Profile Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}
