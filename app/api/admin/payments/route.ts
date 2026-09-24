import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Payment from "@/models/Payment";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectToDatabase();
    const payments = await Payment.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ payments }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load payments" }, { status: 500 });
  }
}