import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import CommunitySnap from "@/models/CommunitySnap";
import Notification from "@/models/Notification";
import { notifyAllMembers } from "@/lib/notify";

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

    const snapLink = `/nature-snaps?snap=${newSnap._id}`;

    // Thank-you notification for the photographer.
    if (clerkId) {
      try {
        await Notification.create({
          clerkId,
          title: "Thanks for posting! 🌿",
          message: `Your nature snap${caption ? ` "${caption}"` : ""} is live and entered for this week's Hall of Fame.`,
          type: "snap",
          link: snapLink,
          imageUrl,
        });
      } catch (notifyError) {
        console.warn("Snap thank-you notification skipped:", notifyError);
      }
    }

    // Alert every other member by in-app notification and email.
    try {
      await notifyAllMembers({
        title: `${fullName || "A member"} posted a new nature snap!`,
        message: `${fullName || "A DEKUWEC member"} just shared a new photo${caption ? `: "${caption}"` : ""}. Tap to view the full snap.`,
        link: snapLink,
        imageUrl,
        excludeClerkIds: [clerkId],
      });
    } catch (notifyError) {
      console.warn("Snap broadcast skipped:", notifyError);
    }

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
