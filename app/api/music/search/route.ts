import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { JamendoError, searchJamendoTracks } from "@/lib/jamendo";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const query = new URL(req.url).searchParams.get("q")?.trim() || "";
  if (query.length < 2 || query.length > 80) {
    return NextResponse.json({ error: "Search terms must be between 2 and 80 characters." }, { status: 400 });
  }

  try {
    const tracks = await searchJamendoTracks(query);
    return NextResponse.json({ tracks });
  } catch (error) {
    if (error instanceof JamendoError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Unexpected Jamendo music search failure:", error);
    return NextResponse.json({ error: "Music search failed. Please try again." }, { status: 502 });
  }
}
