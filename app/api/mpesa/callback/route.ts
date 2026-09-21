import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Payment from "@/models/Payment";

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    // Safaricom nests the callback data deep inside the JSON payload
    const callbackData = data.Body.stkCallback;
    const resultCode = callbackData.ResultCode;
    const checkoutRequestId = callbackData.CheckoutRequestID;

    await connectToDatabase();

    if (resultCode === 0) {
      // ResultCode 0 means SUCCESS. The student entered the correct PIN and had enough funds.
      
      // Extract the official M-Pesa Receipt Number (e.g., QWE123RTY)
      const metaItems = callbackData.CallbackMetadata.Item;
      const receiptItem = metaItems.find((item: any) => item.Name === "MpesaReceiptNumber");
      const mpesaReceipt = receiptItem ? receiptItem.Value : "VERIFIED";

      // Update the database. This instantly tells your frontend polling route that the payment is done!
      await Payment.findOneAndUpdate(
        { checkoutRequestId: checkoutRequestId },
        { $set: { status: "Completed", mpesaReceipt: mpesaReceipt } }
      );

    } else {
      // ResultCode is not 0 (e.g., User cancelled, insufficient funds, timeout)
      await Payment.findOneAndUpdate(
        { checkoutRequestId: checkoutRequestId },
        { $set: { status: "Failed", mpesaReceipt: callbackData.ResultDesc } }
      );
    }

    // Safaricom strictly requires us to send back a successful acknowledgment, otherwise they keep retrying.
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });

  } catch (error) {
    console.error("M-Pesa Callback Error:", error);
    return NextResponse.json({ error: "Callback processing failed" }, { status: 500 });
  }
}
