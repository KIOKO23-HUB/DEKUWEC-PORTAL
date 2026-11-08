import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Merchandise from "@/models/Merchandise";
import { normalizeSizes } from "@/lib/merchandise";

export const dynamic = "force-dynamic";

// Public catalogue for the shareable /merchandise page.
export async function GET() {
  try {
    await connectToDatabase();
    const items = await Merchandise.find({ inStock: true }).sort({ createdAt: -1 }).lean<any[]>();
    const normalized = items.map((item) => ({ ...item, availableSizes: normalizeSizes(item) }));
    return NextResponse.json({ items: normalized }, { headers: { "Cache-Control": "public, max-age=30" } });
  } catch (error) {
    console.error("Public merchandise error:", error);
    return NextResponse.json({ error: "Failed to fetch merchandise" }, { status: 500 });
  }
}
