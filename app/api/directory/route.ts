import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb"; // <-- ADD CURLY BRACES HERE
import Member from "@/models/Member";

export async function GET() {
  try {
    await connectMongoDB();
    const allMembers = await Member.find({}).sort({ createdAt: -1 });
    return NextResponse.json(allMembers, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch directory" }, { status: 500 });
  }
}
