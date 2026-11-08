import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import NatureSnap from "@/models/NatureSnap";
import CommunitySnap from "@/models/CommunitySnap";

export const dynamic = "force-dynamic";

// Public read-only feed used by the shareable /nature-snaps page.
export async function GET() {
  try {
    await connectToDatabase();
    const [officialSnaps, communitySnaps] = await Promise.all([
      NatureSnap.find({}).sort({ createdAt: -1 }).lean(),
      CommunitySnap.find({}).sort({ createdAt: -1 }).lean(),
    ]);

    return NextResponse.json(
      { snaps: officialSnaps, communitySnaps },
      { headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=60" } }
    );
  } catch (error) {
    console.error("Public nature snaps error:", error);
    return NextResponse.json({ error: "Failed to fetch nature snaps" }, { status: 500 });
  }
}
