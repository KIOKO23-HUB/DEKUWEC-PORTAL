import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import CommunitySnap from "@/models/CommunitySnap";
import Notification from "@/models/Notification";

export async function POST(req: Request) {
  try {
    const { snapId, clerkId, action, likerName } = await req.json();
    await connectToDatabase();

    const snap = await CommunitySnap.findById(snapId);
    if (!snap) return NextResponse.json({ error: "Snap not found" }, { status: 404 });

    // Remove user from both arrays first to reset their state
    snap.likes = snap.likes.filter((id: string) => id !== clerkId);
    snap.dislikes = snap.dislikes.filter((id: string) => id !== clerkId);

    // Apply the new action
    if (action === "like") {
      snap.likes.push(clerkId);
      
      // Notify the owner if someone ELSE liked their photo
      if (snap.clerkId !== clerkId) {
        await Notification.create({
          clerkId: snap.clerkId,
          title: "New Like! ❤️",
          message: `${likerName} liked your Weekly Challenge nature snap.`,
          type: "snap",
          link: "/dashboard/snaps"
        });
      }
    } else if (action === "dislike") {
      snap.dislikes.push(clerkId);
    } // If action is "remove", they stay removed.

    await snap.save();
    return NextResponse.json({ message: "Interaction updated", snap }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Interaction failed" }, { status: 500 });
  }
}