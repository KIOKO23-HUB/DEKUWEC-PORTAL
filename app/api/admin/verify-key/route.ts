import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import AdminLog from "@/models/AdminLog";

export async function POST(req: Request) {
  try {
    const { key, clerkId, name, email, action } = await req.json();
    
    // Connect to database for logging
    await connectToDatabase();

    // Silent Background Ping (updates the "Active Now" status automatically while dashboard is open)
    if (action === "ping" && clerkId) {
      await AdminLog.findOneAndUpdate(
        { clerkId },
        { $set: { name, email, lastActive: new Date() } },
        { upsert: true, new: true }
      );
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const expectedKey = process.env.ADMIN_SECRET_KEY;
    if (!expectedKey) {
      return NextResponse.json({ error: "Server admin key not configured" }, { status: 500 });
    }

    // Standard Passcode Login Verification
    if (key === expectedKey) {
      // If the key is correct, permanently log this user in the Admin Database
      if (clerkId && email) {
        await AdminLog.findOneAndUpdate(
          { clerkId },
          { 
            $set: { name, email, lastActive: new Date() },
            $inc: { accessCount: 1 } // Increase their login count
          },
          { upsert: true, new: true }
        );
      }
      return NextResponse.json({ success: true }, { status: 200 });
    } else {
      return NextResponse.json({ error: "Invalid Security Key" }, { status: 401 });
    }
  } catch (error) {
    console.error("Verification Error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
