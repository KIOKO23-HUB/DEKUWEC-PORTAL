import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import Message from "@/models/Message";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const messageId = url.searchParams.get("messageId");
  const isDownload = url.searchParams.get("download") === "1";
  if (!messageId) return NextResponse.json({ error: "Missing message ID" }, { status: 400 });

  try {
    await connectToDatabase();
    const message = isDownload
      ? await Message.findOne({ _id: messageId, $or: [{ senderId: userId }, { receiverId: userId }], viewOnce: false })
      : await Message.findOneAndUpdate(
          { _id: messageId, receiverId: userId, viewOnce: true, viewedAt: null },
          { $set: { viewedAt: new Date() } },
          { new: true }
        );
    if (!message) return NextResponse.json({ error: "This media is unavailable or has already been opened." }, { status: 410 });

    const mediaUrl = new URL(message.mediaUrl);
    if (mediaUrl.hostname !== "res.cloudinary.com") {
      return NextResponse.json({ error: "Unsupported media source" }, { status: 400 });
    }
    const mediaResponse = await fetch(mediaUrl, { cache: "no-store" });
    if (!mediaResponse.ok || !mediaResponse.body) {
      return NextResponse.json({ error: "Media is unavailable" }, { status: 502 });
    }
    const contentType = mediaResponse.headers.get("content-type") || "application/octet-stream";
    const extension = contentType.split("/")[1]?.split(";")[0] || "bin";
    return new Response(mediaResponse.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Disposition": isDownload ? `attachment; filename="dekuwec-message-${messageId}.${extension}"` : "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("View-once media fetch failed:", error);
    return NextResponse.json({ error: "Failed to open media" }, { status: 500 });
  }
}