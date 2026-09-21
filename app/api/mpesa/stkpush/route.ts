import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Payment from "@/models/Payment";

const TOKEN_URL = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
const STK_URL = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";

export async function POST(req: Request) {
  try {
    const { clerkId, fullName, phone, amount, category, reference } = await req.json();
    await connectToDatabase();

    if (!phone || !amount) {
      return NextResponse.json({ error: "Phone number and amount are required" }, { status: 400 });
    }

    // 1. Format the phone number (Safaricom strictly requires 2547XXXXXXXX format)
    let formattedPhone = phone.replace(/\s+/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "254" + formattedPhone.slice(1);
    } else if (formattedPhone.startsWith("+")) {
      formattedPhone = formattedPhone.slice(1);
    }

    // 2. Authenticate and Generate Temporary Access Token
    const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString("base64");
    const tokenResponse = await fetch(TOKEN_URL, {
      headers: { Authorization: `Basic ${auth}` },
    });
    
    if (!tokenResponse.ok) {
      throw new Error("Failed to authenticate with Safaricom");
    }
    
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 3. Generate Cryptographic Password and Timestamp
    const shortCode = process.env.MPESA_SHORTCODE!;
    const passkey = process.env.MPESA_PASSKEY!;
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14); // Format: YYYYMMDDHHmmss
    const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString("base64");

    // 4. Fire the STK Push Request to the User's Phone
    const stkPayload = {
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline", // Standard type for Sandbox testing
      Amount: Math.ceil(Number(amount)), // Safaricom rejects decimals
      PartyA: formattedPhone, // Who is paying
      PartyB: shortCode, // Who is receiving
      PhoneNumber: formattedPhone,
      CallBackURL: "https://dekuwec-portal-k2p9.vercel.app/api/mpesa/callback", // Must be your LIVE Vercel link
      AccountReference: reference || "DEKUWEC",
      TransactionDesc: category || "DEKUWEC Payment"
    };

    const stkResponse = await fetch(STK_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(stkPayload),
    });

    const stkData = await stkResponse.json();

    // 5. Handle the Response & Save to DB
    if (stkData.ResponseCode === "0") {
      // Safaricom accepted the request. Save as Pending with the CheckoutRequestID.
      // We will use this ID in the callback to find and complete the payment.
      const payment = await Payment.create({
        clerkId, 
        fullName, 
        phone: formattedPhone, 
        amount, 
        category, 
        reference, 
        status: "Pending",
        checkoutRequestId: stkData.CheckoutRequestID 
      });

      return NextResponse.json({ 
        success: true, 
        message: "Check your phone! M-Pesa prompt sent.", 
        paymentId: payment._id,
        checkoutRequestId: stkData.CheckoutRequestID 
      }, { status: 200 });
    } else {
      console.error("Safaricom Rejected STK:", stkData);
      return NextResponse.json({ error: stkData.errorMessage || "Failed to push M-Pesa prompt" }, { status: 400 });
    }

  } catch (error: any) {
    console.error("M-Pesa API Error:", error);
    return NextResponse.json({ error: "Internal Server Error connecting to M-Pesa" }, { status: 500 });
  }
}
