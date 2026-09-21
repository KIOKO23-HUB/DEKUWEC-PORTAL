import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Merchandise from "@/models/Merchandise";
import MerchandiseOrder from "@/models/MerchandiseOrder";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const clerkId = searchParams.get("clerkId");

    const items = await Merchandise.find({ inStock: true }).sort({ createdAt: -1 });

    let myOrders = [];
    if (clerkId) {
      myOrders = await MerchandiseOrder.find({ clerkId }).sort({ createdAt: -1 });
    }

    return NextResponse.json({ items, myOrders });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch merchandise" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const {
      clerkId,
      fullName,
      email,
      phone,
      merchandiseId,
      merchandiseTitle,
      imageUrl,
      amount,
      size,
      customName,
      payLater
    } = body;

    if (!clerkId || !merchandiseId || !phone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const order = await MerchandiseOrder.create({
      clerkId,
      fullName,
      email,
      phone,
      merchandiseId,
      merchandiseTitle,
      imageUrl,
      amount,
      size: size || "M",
      customName: customName || "",
      paymentStatus: payLater ? "Pay Later" : "Pending",
      collectionStatus: "Processing",
      pickupNote: "Collect at the weekly physical Wednesday meeting (5:00 PM - 6:45 PM) exactly 1 week after payment verification."
    });

    // Email dispatch trigger (hooks into your existing broadcast/email worker)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/admin/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: email,
          title: `DEKUWEC Merch Order Logged: ${merchandiseTitle}`,
          message: `Congratulations ${fullName}! Your order for ${merchandiseTitle} (${customName ? `Custom Name: ${customName}` : "Standard"}) has been logged. ${
            payLater
              ? "You chose Pay Later. Please settle the payment on the portal before collection."
              : "Payment verification has commenced."
          } Scheduled Pickup: Weekly Wednesday Physical Gathering after 1 week.`,
          link: "/dashboard/merchandise"
        })
      });
    } catch (mailErr) {
      console.warn("Mail dispatch skipped:", mailErr);
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process order" }, { status: 500 });
  }
}