import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import PaymentConfig from "@/models/PaymentConfig";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectToDatabase();
    const config = await PaymentConfig.findOneAndUpdate(
      { key: "default" },
      { $setOnInsert: { key: "default" } },
      { new: true, upsert: true }
    ).lean();
    return NextResponse.json(config, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load payment settings" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const values = {
      member: Math.max(0, Number(body.member)),
      wckUnder23: Math.max(0, Number(body.wckUnder23)),
      wckOver23: Math.max(0, Number(body.wckOver23)),
    };
    if (Object.values(values).some(value => !Number.isFinite(value))) {
      return NextResponse.json({ error: "All fees must be valid numbers." }, { status: 400 });
    }
    await connectToDatabase();
    const config = await PaymentConfig.findOneAndUpdate(
      { key: "default" },
      { $set: values, $setOnInsert: { key: "default" } },
      { new: true, upsert: true, runValidators: true }
    ).lean();
    return NextResponse.json(config, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save payment settings" }, { status: 500 });
  }
}