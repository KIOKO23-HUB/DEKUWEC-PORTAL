import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Payment from "@/models/Payment";
import MerchandiseOrder from "@/models/MerchandiseOrder";
import Notification from "@/models/Notification";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const rawBody = await req.json();
    console.log("Safaricom Callback Payload:", JSON.stringify(rawBody));

    const callbackData = rawBody?.Body?.stkCallback;
    if (!callbackData) {
      return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid payload format" }, { status: 400 });
    }

    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = callbackData;

    await connectToDatabase();

    // 1. Locate the pending payment via CheckoutRequestID
    const payment = await Payment.findOne({ checkoutRequestId: CheckoutRequestID });

    if (!payment) {
      console.warn(`Payment not found for CheckoutRequestID: ${CheckoutRequestID}`);
      // Return 200 OK so Safaricom doesn't endlessly retry delivery
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    // 2. Handle Successful Transaction (ResultCode 0)
    if (ResultCode === 0 && CallbackMetadata?.Item) {
      let mpesaReceipt = "VERIFIED";
      let transactionDate = new Date();
      let paidAmount = payment.amount;

      CallbackMetadata.Item.forEach((item: any) => {
        if (item.Name === "MpesaReceiptNumber") mpesaReceipt = item.Value;
        if (item.Name === "Amount") paidAmount = item.Value;
      });

      // Update payment record in database
      payment.status = "Completed";
      payment.mpesaReceipt = mpesaReceipt;
      payment.updatedAt = new Date();
      await payment.save();

      // If it's a Merchandise order, mark the order as Paid
      if (payment.category === "Club Merchandise" || payment.reference?.toLowerCase().includes("merch")) {
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
              mpesaReceipt: mpesaReceipt 
            } 
          }
        );
      }

      // Generate in-app notification if clerkId exists
      if (payment.clerkId && payment.clerkId !== "anonymous") {
        try {
          await Notification.create({
            clerkId: payment.clerkId,
            title: "Payment Received! 💳",
            message: `Your payment of KES ${paidAmount} for ${payment.reference || payment.category} (Receipt: ${mpesaReceipt}) has been confirmed.`,
            type: "payment",
            link: "/dashboard"
          });
        } catch (notifErr) {
          console.error("Failed to generate in-app payment notification:", notifErr);
        }
      }

      console.log(`Payment confirmed: ${mpesaReceipt} - KES ${paidAmount}`);
    } else {
      // 3. Handle Cancelled or Failed Transaction
      payment.status = "Failed";
      payment.failureReason = ResultDesc || "Cancelled by user or insufficient funds";
      payment.updatedAt = new Date();
      await payment.save();

      console.warn(`Payment failed for ${payment.phone}: ${ResultDesc}`);
    }

    // Always acknowledge Safaricom with ResultCode 0
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    console.error("M-Pesa Webhook Error:", error);
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Error processed" }, { status: 200 });
  }
}