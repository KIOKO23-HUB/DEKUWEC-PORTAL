import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Notification from "@/models/Notification";

// Fetch notifications for the logged-in user
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const clerkId = searchParams.get("clerkId");
    
    if (!clerkId) {
      return NextResponse.json({ error: "Missing clerkId" }, { status: 400 });
    }

    await connectToDatabase();
    
    // Get all notifications for this user, newest first
    const notifications = await Notification.find({ clerkId }).sort({ createdAt: -1 });
    
    return NextResponse.json({ notifications }, { status: 200 });
  } catch (error) {
    console.error("Notifications GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

// Mark specific notification or all notifications as "read"
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { clerkId, notificationId } = body;
    await connectToDatabase();
    
    if (notificationId) {
      // Mark a single specific notification as read when clicked
      await Notification.findByIdAndUpdate(notificationId, { isRead: true });
    } else if (clerkId) {
      // Mark all unread notifications as read when the user clicks "Mark all read"
      await Notification.updateMany({ clerkId, isRead: false }, { isRead: true });
    }
    
    return NextResponse.json({ message: "Notifications updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Notifications PATCH Error:", error);
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}
