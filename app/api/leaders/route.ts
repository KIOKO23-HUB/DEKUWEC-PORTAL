import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Leader from "@/models/Leader";

// FORCE Vercel to bypass the cache and always fetch live photos
export const dynamic = 'force-dynamic'; 

export async function GET() {
  try {
    await connectToDatabase();
    // Fetch all leaders and arrange them by the Hierarchy Order number
    const leaders = await Leader.find({}).sort({ order: 1 });
    return NextResponse.json(leaders, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch leaders" }, { status: 500 });
  }
}
