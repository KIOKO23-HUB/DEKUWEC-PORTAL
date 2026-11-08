import { NextResponse } from "next/server";
import { notifyAllMembers } from "@/lib/notify";

export async function POST(req: Request) {
  try {
    const { title, message, imageUrl, link } = await req.json();
    
    if (!title || !message) {
      return NextResponse.json({ error: "Title and message are required." }, { status: 400 });
    }

    // Reaches every Clerk account plus email-only subscribers collected from the
    // shareable Nature Snaps / Merchandise / WCK pages.
    await notifyAllMembers({ title, message, imageUrl, link });

    return NextResponse.json({ message: "Broadcast sent successfully to all members" }, { status: 200 });
  } catch (error) {
    console.error("Broadcast Error:", error);
    return NextResponse.json({ error: "Failed to send broadcast" }, { status: 500 });
  }
}
