import { NextResponse } from "next/server";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import Message from "@/models/Message";
import MessageConversation from "@/models/MessageConversation";
import Notification from "@/models/Notification";
import { sendEmail } from "@/lib/brevo";

export const dynamic = "force-dynamic";

function getIsoWeekKey(date: Date) {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  day.setUTCDate(day.getUTCDate() + 4 - (day.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((day.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${day.getUTCFullYear()}-${String(week).padStart(2, "0")}`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[character] || character);
}

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const user1 = searchParams.get("user1");
    const user2 = searchParams.get("user2");

    if (!user1 || user1 !== userId || !user2 || user2 === userId) {
      return NextResponse.json({ error: "Missing user IDs" }, { status: 400 });
    }

    await connectToDatabase();

    const criteria: Record<string, any> = {
      $or: [
        { senderId: userId, receiverId: user2 },
        { senderId: user2, receiverId: userId }
      ]
    };
    const after = searchParams.get("after");
    if (after && mongoose.Types.ObjectId.isValid(after)) {
      criteria._id = { $gt: new mongoose.Types.ObjectId(after) };
    }
    await Message.updateMany({ senderId: user2, receiverId: userId, isRead: false }, { $set: { isRead: true } });
    const [messages, conversation] = await Promise.all([
      Message.find(criteria).sort({ createdAt: -1 }).limit(100).lean(),
      MessageConversation.findOne({ participantKey: [userId, user2].sort().join(":") }).lean()
    ]);

    const safeMessages = messages.reverse().map((message: any) => ({
      ...message,
      mediaUrl: message.viewOnce ? "" : message.mediaUrl,
    }));
    return NextResponse.json({ messages: safeMessages, streakWeeks: (conversation as any)?.streakWeeks || 0 }, { status: 200 });
  } catch (error) {
    console.error("Messages GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch chat history" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { receiverId, content = "", mediaUrl = "", mediaType = "", viewOnce = false, sticker = false } = body;
    const text = typeof content === "string" ? content.trim() : "";
    if (!receiverId || receiverId === userId || (!text && !mediaUrl) || text.length > 2000) {
      return NextResponse.json({ error: "A recipient and message or attachment are required." }, { status: 400 });
    }
    if (mediaUrl && (!/^https:\/\/res\.cloudinary\.com\/[\w-]+\/video\/upload\//.test(mediaUrl) && !/^https:\/\/res\.cloudinary\.com\/[\w-]+\/image\/upload\//.test(mediaUrl))) {
      return NextResponse.json({ error: "Unsupported media URL." }, { status: 400 });
    }
    if (mediaUrl && !["image", "video"].includes(mediaType)) {
      return NextResponse.json({ error: "Unsupported media type." }, { status: 400 });
    }

    await connectToDatabase();
    const [sender, receiver] = await Promise.all([
      currentUser(),
      (await clerkClient()).users.getUser(receiverId).catch(() => null)
    ]);
    if (!sender || !receiver) return NextResponse.json({ error: "Sender or recipient could not be found." }, { status: 404 });

    const senderName = sender.fullName || "DEKUWEC Member";
    const receiverName = [receiver.firstName, receiver.lastName].filter(Boolean).join(" ") || "DEKUWEC Member";
    const newMessage = await Message.create({
      senderId: userId,
      senderName,
      receiverId,
      receiverName,
      content: text,
      mediaUrl,
      mediaType,
      viewOnce: Boolean(viewOnce && mediaUrl),
      messageType: sticker && !mediaUrl ? "sticker" : "message",
    });

    const now = new Date();
    const weekKey = getIsoWeekKey(now);
    const participantKey = [userId, receiverId].sort().join(":");
    let conversation = await MessageConversation.findOne({ participantKey });
    const startedStreak = !conversation;
    if (!conversation) {
      conversation = await MessageConversation.create({ participantKey, participants: [userId, receiverId] });
    }

    const previousWeekDate = new Date(now);
    previousWeekDate.setUTCDate(previousWeekDate.getUTCDate() - 7);
    const previousWeek = getIsoWeekKey(previousWeekDate);
    if (conversation.activeWeek !== weekKey) {
      if (conversation.lastMutualWeek !== previousWeek) conversation.streakWeeks = 0;
      conversation.activeWeek = weekKey;
      conversation.activeWeekParticipants = [];
    }
    if (!conversation.activeWeekParticipants.includes(userId)) conversation.activeWeekParticipants.push(userId);
    if (receiverId && conversation.activeWeekParticipants.includes(receiverId) && conversation.lastMutualWeek !== weekKey) {
      conversation.streakWeeks = conversation.lastMutualWeek === previousWeek ? conversation.streakWeeks + 1 : 1;
      conversation.lastMutualWeek = weekKey;
    }
    conversation.lastMessageAt = now;
    await conversation.save();

    const preview = text || (mediaType === "video" ? "Sent a video" : "Sent a photo");
    const messageLink = `/dashboard?openMessages=1&contact=${encodeURIComponent(userId)}`;
    try {
      await Notification.create({
      clerkId: receiverId,
      title: `New message from ${senderName}`,
      message: preview.slice(0, 120),
      type: "message",
        link: messageLink
      });
    } catch (notificationError) {
      console.error("Message saved, but in-app notification failed:", notificationError);
    }
    let streakSystemMessage = null;
    if (startedStreak) {
      try {
        streakSystemMessage = await Message.create({
          senderId: userId,
          senderName: "DEKUWEC",
          receiverId,
          receiverName,
          content: `${senderName} started a messaging streak with you. Send a reply this week to keep it going!`,
          messageType: "system",
          isRead: false,
        });
      } catch (streakError) {
        console.error("Message saved, but streak announcement failed:", streakError);
      }
      try {
        await Notification.create({
          clerkId: receiverId,
          title: "🔥 A messaging streak started",
          message: `${senderName} started a messaging streak with you. Reply this week to keep it going!`,
          type: "message",
          link: messageLink
        });
      } catch (notificationError) {
        console.error("Streak started, but in-app notification failed:", notificationError);
      }
    }

    const recipientEmail = receiver.emailAddresses.find((email) => email.id === receiver.primaryEmailAddressId)?.emailAddress;
    if (recipientEmail) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.dekuwec.app";
      const safeName = escapeHtml(senderName);
      try {
        await sendEmail({
          to: recipientEmail,
          subject: `New DEKUWEC message from ${senderName}`,
          htmlContent: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#16352a"><h2>You have a new message</h2><p><strong>${safeName}</strong> sent you a message in the DEKUWEC portal.</p><a href="${baseUrl.replace(/\/$/, "")}${messageLink}" style="display:inline-block;padding:12px 18px;background:#047857;color:white;text-decoration:none;border-radius:8px;font-weight:bold">Open your messages</a></div>`
        });
      } catch (emailError) {
        console.error("Message saved, but email notification failed:", emailError);
      }
    }

    return NextResponse.json({ message: "Message sent successfully", data: newMessage, systemMessage: streakSystemMessage, startedStreak, streakWeeks: conversation.streakWeeks }, { status: 201 });
  } catch (error) {
    console.error("Message POST Error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
