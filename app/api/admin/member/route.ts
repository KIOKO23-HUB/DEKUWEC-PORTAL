import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Member from "@/models/Member";
import { clerkClient } from "@clerk/nextjs/server";

export async function PUT(req: Request) {
  try {
    const { id, fullName, email, course, status } = await req.json();
    await connectToDatabase();
    
    // Uses the Clerk ID to update or create a local database record
    const updated = await Member.findOneAndUpdate(
      { clerkId: id }, 
      { clerkId: id, fullName, email, course, status }, 
      { new: true, upsert: true }
    );
    return NextResponse.json({ message: "Member updated", member: updated }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const clerkId = searchParams.get("id"); // Now receives the secure Clerk ID

    if (!clerkId) {
      return NextResponse.json({ error: "Missing User ID" }, { status: 400 });
    }

    await connectToDatabase();
    
    // 1. Erase from local MongoDB
    await Member.findOneAndDelete({ clerkId });

    // 2. Permanently erase authentication profile from Clerk
    const client = await clerkClient();
    await client.users.deleteUser(clerkId);

    return NextResponse.json({ message: "User account permanently deleted from the system" }, { status: 200 });
  } catch (error) {
    console.error("Delete Member Error:", error);
    return NextResponse.json({ error: "Failed to delete user account" }, { status: 500 });
  }
}
