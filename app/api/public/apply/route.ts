import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Merchandise from "@/models/Merchandise";
import MerchandiseOrder from "@/models/MerchandiseOrder";
import WckApplication from "@/models/WckApplication";
import Notification from "@/models/Notification";
import { sendEmail } from "@/lib/brevo";
import { absoluteLink, notificationEmailHtml } from "@/lib/notify";
import { ensureMember, guestClerkId } from "@/lib/members";

export const dynamic = "force-dynamic";

type ApplyBody = {
  action?: "subscribe" | "wck" | "merchandise";
  type?: "subscribe" | "wck" | "merchandise";
  clerkId?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  yearOfStudy?: string;
  ageBracket?: string;
  merchandiseId?: string;
  size?: string;
  color?: string;
  customName?: string;
  payLater?: boolean;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ApplyBody;
    const action = body.action || body.type || "subscribe";
    const email = (body.email || "").trim().toLowerCase();
    const fullName = (body.fullName || "").trim() || email.split("@")[0];
    const clerkId = body.clerkId?.trim() || "";

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    await connectToDatabase();
    const member = await ensureMember({ clerkId, email, fullName });

    if (action === "subscribe") {
      if (!member) {
        return NextResponse.json({ error: "Could not add you to the directory." }, { status: 500 });
      }

      try {
        await sendEmail({
          to: email,
          subject: "You're on the DEKUWEC list 🌿",
          htmlContent: notificationEmailHtml({
            title: "You're on the DEKUWEC notification list",
            message: `Hello ${fullName},\n\nYou have been added to the DEKUWEC member directory. You will now receive club broadcasts, event updates and Nature Snap announcements by email and in your portal notifications once you sign in.\n\nNature Snaps: ${absoluteLink("/nature-snaps")}\nMerchandise: ${absoluteLink("/merchandise")}\nWCK Card: ${absoluteLink("/wck")}`,
            link: "/nature-snaps",
          }),
        });
      } catch (mailErr) {
        console.warn("Directory welcome email skipped:", mailErr);
      }

      if (clerkId) {
        await Notification.create({
          clerkId,
          title: "You're subscribed 🌿",
          message: "You will now receive DEKUWEC broadcasts and nature snap announcements.",
          type: "general",
          link: "/nature-snaps",
        });
      }

      return NextResponse.json({ message: "Added to the member directory.", member });
    }

    const ownerId = clerkId || guestClerkId(email);

    if (action === "wck") {
      if (!body.phone?.trim()) {
        return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
      }

      const existing = await WckApplication.findOne({ clerkId: ownerId });
      const application = await WckApplication.findOneAndUpdate(
        { clerkId: ownerId },
        {
          clerkId: ownerId,
          fullName,
          email,
          phone: body.phone.trim(),
          yearOfStudy: body.yearOfStudy || "Year 1",
          ageBracket: body.ageBracket || "Below 23 years",
          paymentStatus: existing?.paymentStatus || "Not Yet Paid",
          amountPaid: existing?.amountPaid || 0,
          mpesaReceipt: existing?.mpesaReceipt || "",
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      if (!existing) {
        try {
          await sendEmail({
            to: email,
            subject: "WCK Card application received 🎉",
            htmlContent: notificationEmailHtml({
              title: "WCK Card Application Received",
              message: `Hello ${fullName},\n\nThank you for applying for the Wildlife Clubs of Kenya (WCK) student affiliate card. Your application is logged and you have been added to the DEKUWEC member directory.\n\nNext step: complete the M-Pesa payment on the portal so the executive can verify your card.`,
              link: "/wck",
            }),
          });
        } catch (mailErr) {
          console.warn("WCK confirmation email skipped:", mailErr);
        }

        if (clerkId) {
          await Notification.create({
            clerkId,
            title: "WCK Card application pending 💳",
            message: "Your application is under review. Complete your M-Pesa payment to activate the card.",
            type: "wck",
            link: "/wck",
          });
        }
      }

      return NextResponse.json({ message: "Application received.", application });
    }

    if (action === "merchandise") {
      if (!body.merchandiseId || !body.phone?.trim()) {
        return NextResponse.json({ error: "Select an item and enter a phone number." }, { status: 400 });
      }

      const item = await Merchandise.findById(body.merchandiseId);
      if (!item) {
        return NextResponse.json({ error: "That merchandise item is unavailable." }, { status: 404 });
      }

      const order = await MerchandiseOrder.create({
        clerkId: ownerId,
        fullName,
        email,
        phone: body.phone.trim(),
        merchandiseId: String(item._id),
        merchandiseTitle: item.title,
        imageUrl: item.imageUrl,
        amount: item.price,
        size: body.size || item.availableSizes?.[0] || "M",
        color: body.color || "",
        customName: item.allowCustomName ? (body.customName || "").trim() : "",
        paymentStatus: body.payLater ? "Pay Later" : "Pending",
        collectionStatus: "Processing",
        pickupNote:
          "Collect at the weekly physical Wednesday meeting (5:00 PM - 6:45 PM) exactly 1 week after payment verification.",
      });

      try {
        await sendEmail({
          to: email,
          subject: `Merchandise order logged: ${item.title}`,
          htmlContent: notificationEmailHtml({
            title: "Merchandise Order Logged",
            message: `Hello ${fullName},\n\nYour order for ${item.title}${order.customName ? ` (custom name: ${order.customName})` : ""} has been logged. You have also been added to the DEKUWEC member directory for broadcasts.\n\nPayment: ${order.paymentStatus}. Pickup: weekly Wednesday physical gathering, one week after payment verification.`,
            imageUrl: item.imageUrl,
            link: "/merchandise",
          }),
        });
      } catch (mailErr) {
        console.warn("Merchandise confirmation email skipped:", mailErr);
      }

      if (clerkId) {
        await Notification.create({
          clerkId,
          title: `Order logged: ${item.title} 🛍️`,
          message: `Your order has been received. Payment status: ${order.paymentStatus}.`,
          type: "merchandise",
          link: "/merchandise",
        });
      }

      return NextResponse.json({ message: "Order received.", order });
    }

    return NextResponse.json({ error: "Unknown application type." }, { status: 400 });
  } catch (error: any) {
    console.error("Public apply error:", error);
    return NextResponse.json({ error: error?.message || "Failed to submit application." }, { status: 500 });
  }
}
