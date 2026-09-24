import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Payment from "@/models/Payment";
import MerchandiseOrder from "@/models/MerchandiseOrder";
import Notification from "@/models/Notification";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const rawBody = await req.json();
    console.log("👉 SAFARICOM LIVE CALLBACK PAYLOAD:", JSON.stringify(rawBody));

    const callback = rawBody?.Body?.stkCallback;
    if (!callback) {
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
    }

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = callback;

    await connectToDatabase();

    const payment = await Payment.findOne({ checkoutRequestId: CheckoutRequestID });

    if (!payment) {
      console.warn("Payment not found for CheckoutRequestID:", CheckoutRequestID);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
    }

    if (ResultCode === 0) {
      let mpesaReceipt = "VERIFIED";
      let amountPaid = payment.amount;

      if (CallbackMetadata?.Item && Array.isArray(CallbackMetadata.Item)) {
        for (const item of CallbackMetadata.Item) {
          if (item.Name === "MpesaReceiptNumber") mpesaReceipt = String(item.Value);
          if (item.Name === "Amount") amountPaid = Number(item.Value);
        }
      }

      payment.status = "Completed";
      payment.mpesaReceipt = mpesaReceipt;
      payment.updatedAt = new Date();
      await payment.save();

      // Update Merchandise Order if applicable
      await MerchandiseOrder.updateMany(
        {
          $or: [
            { clerkId: payment.clerkId, paymentStatus: "Pending" },
            { phone: payment.phone, paymentStatus: "Pending" }
          ]
        },
        {
          $set: {
            paymentStatus: "Paid",
            mpesaReceipt: mpesaReceipt,
            updatedAt: new Date()
          }
        }
      );

      // Create notification
      if (payment.clerkId && payment.clerkId !== "anonymous") {
        try {
          await Notification.create({
            clerkId: payment.clerkId,
            title: "Payment Received! 💳",
            message: `Your payment of KES ${amountPaid} for ${payment.reference || payment.category} (Receipt: ${mpesaReceipt}) was confirmed.`,
            type: "payment",
            link: "/dashboard"
          });
        } catch (notifErr) {
          console.error("Notification creation error:", notifErr);
        }
      }

      console.log(`✅ Success: ${mpesaReceipt} - KES ${amountPaid}`);
    } else {
      payment.status = "Failed";
      payment.failureReason = ResultDesc || "Failed / Cancelled";
      payment.updatedAt = new Date();
      await payment.save();
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Success" }, { status: 200 });
  } catch (error: any) {
    console.error("Callback Processing Error:", error);
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Error processed" }, { status: 200 });
  }
}