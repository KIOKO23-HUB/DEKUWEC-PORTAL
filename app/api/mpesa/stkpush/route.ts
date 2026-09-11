import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Payment from "@/models/Payment";

export async function POST(req: Request) {
  try {
    const { clerkId, fullName, phone, amount, category, reference } = await req.json();
    await connectToDatabase();

    // 1. Create a Pending Payment Record
    const payment = await Payment.create({
      clerkId, fullName, phone, amount, category, reference, status: "Pending"
    });

    // 2. SIMULATE SAFARICOM STK PUSH DELAY (Dummy API)
    // In the future, the live Daraja API code will go here.
    setTimeout(async () => {
       const mockReceipt = "SFC" + Math.floor(Math.random() * 1000000000).toString();
       await Payment.findByIdAndUpdate(payment._id, { 
         status: "Completed", 
         mpesaReceipt: mockReceipt 
       });
    }, 5000); // Simulates the student entering their PIN after 5 seconds

    return NextResponse.json({ message: "M-Pesa Prompt sent", paymentId: payment._id }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Payment initiation failed" }, { status: 500 });
  }
}