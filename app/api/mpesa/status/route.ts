import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Payment from "@/models/Payment";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const checkoutRequestId = searchParams.get("checkoutRequestId");
    const id = searchParams.get("id");

    if (!checkoutRequestId && !id) {
      return NextResponse.json({ error: "Missing checkoutRequestId or id" }, { status: 400 });
    }

    await connectToDatabase();

    let query: Record<string, any> = {};
    if (checkoutRequestId) {
      query.checkoutRequestId = checkoutRequestId;
    } else if (id) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        query._id = new mongoose.Types.ObjectId(id);
      } else {
        query._id = id;
      }
    }

    const payment = await Payment.findOne(query);

    if (!payment) {
      return NextResponse.json({ status: "Pending" }, { status: 200 });
    }

    const completedPayments = await Payment.find({
      clerkId: payment.clerkId,
      category: payment.category,
      reference: payment.reference,
      status: "Completed"
    }).select("amount totalDue").lean();
    const totalDue = Number(payment.totalDue || payment.amount || 0);
    const totalPaid = completedPayments.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return NextResponse.json({
      status: payment.status || "Pending",
      receipt: payment.mpesaReceipt || "",
      amount: payment.amount,
      totalDue,
      totalPaid,
      balance: Math.max(0, totalDue - totalPaid),
    }, { status: 200 });
  } catch (err: any) {
    console.error("Status route error:", err);
    return NextResponse.json({ error: "Failed to poll status" }, { status: 500 });
  }
}