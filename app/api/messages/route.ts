import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Message from "@/models/Message";

// Fetch chat history between two users
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const user1 = searchParams.get("user1"); // The logged-in user
    const user2 = searchParams.get("user2"); // The person they are chatting with

    if (!user1 || !user2) {
      return NextResponse.json({ error: "Missing user IDs" }, { status: 400 });
    }

    await connectToDatabase();
    
    // Find all messages sent between these two specific IDs
    const messages = await Message.find({
      $or: [
        { senderId: user1, receiverId: user2 },
        { senderId: user2, receiverId: user1 }
      ]
    }).sort({ createdAt: 1 }); // Sort oldest to newest for the chat window

    return NextResponse.json({ messages }, { status: 200 });
  } catch (error) {
    console.error("Messages GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch chat history" }, { status: 500 });
  }
}

// Send a new Direct Message
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { senderId, senderName, receiverId, receiverName, content } = body;

    await connectToDatabase();
    
    const newMessage = new Message({
      senderId,
      senderName,
      receiverId,
      receiverName,
      content
    });

    await newMessage.save();

    return NextResponse.json({ message: "Message sent successfully", data: newMessage }, { status: 201 });
  } catch (error) {
    console.error("Message POST Error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
