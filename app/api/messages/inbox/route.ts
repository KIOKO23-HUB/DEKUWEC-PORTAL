import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import Message from "@/models/Message";
import MessageConversation from "@/models/MessageConversation";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectToDatabase();
    const [conversations, streaks] = await Promise.all([Message.aggregate([
      { $match: { $or: [{ senderId: userId }, { receiverId: userId }] } },
      { $addFields: { contactId: { $cond: [{ $eq: ["$senderId", userId] }, "$receiverId", "$senderId"] } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$contactId",
          totalMessages: { $sum: 1 },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$receiverId", userId] }, { $eq: ["$isRead", false] }] },
                1,
                0,
              ],
            },
          },
          lastMessageAt: { $first: "$createdAt" },
          lastMessage: { $first: "$content" },
          lastMessageType: { $first: "$messageType" },
          lastMediaType: { $first: "$mediaType" },
        },
      },
      { $sort: { totalMessages: -1, lastMessageAt: -1 } },
    ]), MessageConversation.find({ participants: userId }).select("participantKey streakWeeks").lean()]);

    const streakByContactId = new Map<string, number>();
    streaks.forEach((conversation: any) => {
      const contactId = conversation.participantKey.split(":").find((participantId: string) => participantId !== userId);
      if (contactId) streakByContactId.set(contactId, conversation.streakWeeks || 0);
    });

    return NextResponse.json({
      conversations: conversations.map((conversation) => ({
        contactId: conversation._id,
        totalMessages: conversation.totalMessages,
        unreadCount: conversation.unreadCount,
        lastMessageAt: conversation.lastMessageAt,
        lastMessage: conversation.lastMessage,
        lastMessageType: conversation.lastMessageType,
        lastMediaType: conversation.lastMediaType,
        streakWeeks: streakByContactId.get(conversation._id) || 0,
      })),
      unreadTotal: conversations.reduce((total, conversation) => total + conversation.unreadCount, 0),
    });
  } catch (error) {
    console.error("Message inbox summary failed:", error);
    return NextResponse.json({ error: "Failed to load message inbox" }, { status: 500 });
  }
}
