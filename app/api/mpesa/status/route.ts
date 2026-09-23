import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Payment from "@/models/Payment";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const checkoutRequestId = searchParams.get("checkoutRequestId");

    if (!checkoutRequestId) {
      return NextResponse.json({ error: "Missing checkoutRequestId" }, { status: 400 });
    }

    await connectToDatabase();
    const payment = await Payment.findOne({ checkoutRequestId });

    if (!payment) {
      return NextResponse.json({ status: "Pending" });
    }

    return NextResponse.json({
      status: payment.status, // Will be "Completed" once Safaricom hits the callback
      receipt: payment.mpesaReceipt || "",
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to poll status" }, { status: 500 });
  }
}