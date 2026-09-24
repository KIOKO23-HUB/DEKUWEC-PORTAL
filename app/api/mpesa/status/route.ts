import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Payment from "@/models/Payment";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const checkoutRequestId = searchParams.get("checkoutRequestId");
    const id = searchParams.get("id"); // Accept standard MongoDB ID as well

    if (!checkoutRequestId && !id) {
      return NextResponse.json(
        { error: "Missing checkoutRequestId or id" }, 
        { status: 400 }
      );
    }

    await connectToDatabase();
    
    // Look up the payment using whichever parameter the frontend provided
    const query = checkoutRequestId ? { checkoutRequestId } : { _id: id };
    const payment = await Payment.findOne(query);

    if (!payment) {
      // If the database hasn't saved it yet, keep it pending
      return NextResponse.json({ status: "Pending" });
    }

    return NextResponse.json({
      status: payment.status, // "Pending", "Completed", or "Failed"
      receipt: payment.mpesaReceipt || "",
    });
  } catch (err) {
    console.error("Status check error:", err);
    return NextResponse.json({ error: "Failed to poll status" }, { status: 500 });
  }
}