import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import MessagePresence from "@/models/MessagePresence";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    if (Array.isArray(body.userIds)) {
      const ids = body.userIds.filter((id: unknown): id is string => typeof id === "string").slice(0, 500);
      if (ids.some((id: string) => id.length > 128)) return NextResponse.json({ error: "Invalid member IDs" }, { status: 400 });
      await connectToDatabase();
      const records = await MessagePresence.find({ clerkId: { $in: ids } }).select("clerkId lastSeenAt").lean();
      const cutoff = Date.now() - 90_000;
      return NextResponse.json({ presence: records.map((record) => ({
        clerkId: record.clerkId,
        lastSeenAt: record.lastSeenAt,
        isOnline: new Date(record.lastSeenAt).getTime() >= cutoff,
      })) });
    }

    await connectToDatabase();
    const lastSeenAt = new Date();
    const update: Record<string, any> = { $set: { lastSeenAt } };
    if (Object.prototype.hasOwnProperty.call(body, "typingTo")) {
      if (body.typingTo !== null && (typeof body.typingTo !== "string" || body.typingTo.length > 128 || body.typingTo === userId)) {
        return NextResponse.json({ error: "Invalid typing recipient" }, { status: 400 });
      }
      if (body.typingTo) {
        update.$set.typingTo = body.typingTo;
        update.$set.typingUntil = new Date(Date.now() + 8000);
      } else {
        update.$unset = { typingTo: 1, typingUntil: 1 };
      }
    }
    await MessagePresence.findOneAndUpdate(
      { clerkId: userId },
      update,
      { upsert: true, new: true }
    );
    return NextResponse.json({ lastSeenAt });
  } catch (error) {
    console.error("Presence update failed:", error);
    return NextResponse.json({ error: "Failed to update presence" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ids = new URL(req.url).searchParams.get("userIds")?.split(",").filter(Boolean).slice(0, 500) || [];
  const typingWith = new URL(req.url).searchParams.get("typingWith");
  if (ids.some((id) => id.length > 128)) return NextResponse.json({ error: "Invalid member IDs" }, { status: 400 });

  try {
    await connectToDatabase();
    if (typingWith) {
      if (typingWith.length > 128 || typingWith === userId) return NextResponse.json({ error: "Invalid member ID" }, { status: 400 });
      const peer = await MessagePresence.findOne({ clerkId: typingWith }).select("typingTo typingUntil").lean() as any;
      return NextResponse.json({
        isTyping: peer?.typingTo === userId && peer?.typingUntil && new Date(peer.typingUntil).getTime() > Date.now(),
      });
    }
    const records = await MessagePresence.find({ clerkId: { $in: ids } }).select("clerkId lastSeenAt").lean();
    const cutoff = Date.now() - 90_000;
    return NextResponse.json({ presence: records.map((record) => ({
      clerkId: record.clerkId,
      lastSeenAt: record.lastSeenAt,
      isOnline: new Date(record.lastSeenAt).getTime() >= cutoff,
    })) });
  } catch (error) {
    console.error("Presence fetch failed:", error);
    return NextResponse.json({ error: "Failed to load presence" }, { status: 500 });
  }
}