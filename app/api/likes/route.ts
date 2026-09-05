import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import PortalStat from "@/models/PortalStat";

export async function GET() {
  try {
    await connectToDatabase();
    let stat = await PortalStat.findOne({ type: 'likes' });
    
    // If it doesn't exist yet, create it starting at 20
    if (!stat) {
      stat = await PortalStat.create({ type: 'likes', count: 20 });
    }
    
    return NextResponse.json({ likes: stat.count }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch likes" }, { status: 500 });
  }
}

export async function POST() {
  try {
    await connectToDatabase();
    let stat = await PortalStat.findOne({ type: 'likes' });
    
    if (!stat) {
      // If first time, start at 20 + the 1 new like = 21
      stat = await PortalStat.create({ type: 'likes', count: 21 });
    } else {
      stat.count += 1;
      await stat.save();
    }
    
    return NextResponse.json({ likes: stat.count }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update likes" }, { status: 500 });
  }
}
