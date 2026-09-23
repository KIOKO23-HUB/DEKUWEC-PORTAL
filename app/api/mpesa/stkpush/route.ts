import { NextResponse } from "next/server";
import { Buffer } from "node:buffer";
import { connectToDatabase } from "@/lib/mongodb";
import Payment from "@/models/Payment";

export const dynamic = "force-dynamic";

// PRODUCTION SAFARICOM LIVE ENDPOINTS
const TOKEN_URL = "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
const STK_URL = "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest";

function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "254" + cleaned.slice(1);
  } else if (cleaned.startsWith("7") || cleaned.startsWith("1")) {
    cleaned = "254" + cleaned;
  } else if (cleaned.startsWith("+254")) {
    cleaned = cleaned.slice(1);
  }
  return cleaned;
}

function getTimestamp(): string {
  const date = new Date();
  const YYYY = date.getFullYear().toString();
  const MM = String(date.getMonth() + 1).padStart(2, "0");
  const DD = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${YYYY}${MM}${DD}${hh}${mm}${ss}`;
}

export async function POST(req: Request) {
  try {
    const { clerkId, fullName, phone, amount, category, reference } = await req.json();

    if (!phone || !amount) {
      return NextResponse.json(
        { error: "Phone number and amount are required." },
        { status: 400 }
      );
    }

    const consumerKey = process.env.MPESA_CONSUMER_KEY?.trim();
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET?.trim();
    const shortCode = process.env.MPESA_SHORTCODE?.trim() || "4218224"; // Store Number[cite: 13]
    const passkey = process.env.MPESA_PASSKEY?.trim() || "4a5623a174fd4e14cc6dfca263a7674ff8f9bcc9325313014347e50382d076ba"; //[cite: 13]
    const tillNumber = process.env.MPESA_TILL?.trim() || "1715230"; // DEKUWEC Till Number

    if (!consumerKey || !consumerSecret) {
      return NextResponse.json(
        { error: "Production Consumer Key or Secret not configured in environment." },
        { status: 500 }
      );
    }

    // 1. Authenticate with Safaricom Production Server
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    const tokenResponse = await fetch(TOKEN_URL, {
      method: "GET",
      headers: { Authorization: `Basic ${auth}` },
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error("Daraja Production Auth Error:", errText);
      return NextResponse.json(
        { error: `Safaricom Auth Failed: ${errText}` },
        { status: 502 }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 2. Generate Cryptographic Password and Timestamp
    const timestamp = getTimestamp();
    const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString("base64");
    const formattedPhone = formatPhoneNumber(phone);

    // Clean references to prevent parameter rejection
    const safeRef = (reference || "DEKUWEC").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
    const safeDesc = (category || "DEKUWEC").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);

    // 3. Fire the Live STK Push Payload for Buy Goods
    const stkPayload = {
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerBuyGoodsOnline",
      Amount: Math.ceil(Number(amount)),
      PartyA: formattedPhone,
      PartyB: tillNumber,
      PhoneNumber: formattedPhone,
      CallBackURL: "https://dekuwec.app/api/mpesa/callback",
      AccountReference: safeRef || "DEKUWEC",
      TransactionDesc: safeDesc || "DEKUWEC",
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

    // 4. Handle Response & Save Record in Database
    if (stkData.ResponseCode === "0") {
      await connectToDatabase();
      const payment = await Payment.create({
        clerkId: clerkId || "anonymous",
        fullName: fullName || "Member",
        phone: formattedPhone,
        amount: Math.ceil(Number(amount)),
        category: category || "General Payment",
        reference: reference || "DEKUWEC",
        status: "Pending",
        checkoutRequestId: stkData.CheckoutRequestID,
        merchantRequestId: stkData.MerchantRequestID,
      });

      return NextResponse.json(
        {
          success: true,
          message: "Check your phone! M-Pesa prompt sent.",
          paymentId: payment._id,
          checkoutRequestId: stkData.CheckoutRequestID,
        },
        { status: 200 }
      );
    } else {
      console.error("Safaricom Rejected STK:", stkData);
      return NextResponse.json(
        { error: stkData.errorMessage || stkData.ResponseDescription || "Failed to push M-Pesa prompt" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("M-Pesa API Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error connecting to M-Pesa" },
      { status: 500 }
    );
  }
}