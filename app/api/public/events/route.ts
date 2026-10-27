import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import EventItem from "@/models/EventItem";
import EventRegistration from "@/models/EventRegistration";
import { sendEmail } from "@/lib/brevo";

export const dynamic = "force-dynamic";

const CLUB_EMAIL = "wildlifeandenvironmentalclub@dkut.ac.ke";

// Same defaults the portal checkout uses when an event has no custom tiers
const DEFAULT_TIERS = [
  { id: "member", label: "Registered Club Member", amount: 650 },
  { id: "first_year", label: "First Year Student", amount: 650 },
  { id: "non_member", label: "Non-Member / Associate", amount: 750 },
];

function esc(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tiersFor(event: any): { id: string; label: string; amount: number }[] {
  if (Array.isArray(event?.paymentTiers) && event.paymentTiers.length > 0) {
    return event.paymentTiers.map((tier: any) => ({
      id: String(tier.id),
      label: String(tier.label),
      amount: Number(tier.amount) || 0,
    }));
  }
  return DEFAULT_TIERS;
}

function formatPhone(phone: string) {
  let cleaned = (phone || "").replace(/\D/g, "");
  if (cleaned.startsWith("0")) cleaned = "254" + cleaned.slice(1);
  else if (cleaned.startsWith("7") || cleaned.startsWith("1")) cleaned = "254" + cleaned;
  else if (cleaned.startsWith("+254")) cleaned = cleaned.slice(1);
  return cleaned;
}

export async function GET() {
  try {
    await connectToDatabase();
    const events = await EventItem.find({ category: "upcoming" }).sort({ createdAt: -1 }).lean();

    return NextResponse.json(
      {
        events: events.map((event: any) => ({
          _id: String(event._id),
          title: event.title,
          date: event.date,
          time: event.time || "",
          location: event.location || "",
          imageUrl: event.imageUrl || "",
          description: event.description || "",
          isFree: !!event.isFree,
          tiers: tiersFor(event),
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Public events GET error:", error);
    return NextResponse.json({ error: "Failed to load events" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { eventId, tierId, fullName, regNo, phone, email } = body;

    const studentEmail = String(email || "").trim().toLowerCase();
    const safePhone = formatPhone(String(phone || ""));

    if (!eventId || !fullName || !regNo || !studentEmail || !safePhone) {
      return NextResponse.json(
        { error: "Name, registration number, email and M-Pesa phone number are required." },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    if (safePhone.length !== 12 || !safePhone.startsWith("254")) {
      return NextResponse.json({ error: "Enter a valid Safaricom number, e.g. 0712345678." }, { status: 400 });
    }

    await connectToDatabase();
    const event = await EventItem.findById(eventId);
    if (!event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    const tiers = tiersFor(event);
    const tier = tiers.find((item) => item.id === tierId) || tiers[0];
    const amount = event.isFree ? 0 : Number(tier.amount) || 0;

    const clerkId = `public_${crypto.createHash("sha256").update(studentEmail).digest("hex").slice(0, 24)}`;
    const emailPattern = new RegExp(`^${studentEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");

    const existing = await EventRegistration.findOne({ eventName: event.title, email: emailPattern });
    if (existing && existing.paymentStatus === "Paid") {
      return NextResponse.json(
        { error: "This email is already registered and paid for this event." },
        { status: 409 }
      );
    }

    const payload = {
      clerkId,
      eventId: String(event._id),
      fullName: String(fullName).trim(),
      email: studentEmail,
      phone: safePhone,
      phoneNumber: safePhone,
      registrationNumber: String(regNo).trim(),
      eventName: event.title,
      paymentStatus: event.isFree ? "Paid" : "Not Yet Paid",
      amountPaid: 0,
      tierId: tier.id,
      tierLabel: tier.label,
      amountDue: amount,
    };

    const registration = existing
      ? await EventRegistration.findByIdAndUpdate(existing._id, payload, { new: true })
      : await EventRegistration.create(payload);

    if (!event.isFree) {
      const mailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; color: #111827;">
          <h2 style="color: #064e3b; margin: 0 0 4px 0; font-size: 21px; font-weight: 800;">Registration received</h2>
          <p style="font-size: 13px; color: #059669; font-weight: bold; margin: 0 0 16px 0;">${esc(event.title)}</p>
          <p style="font-size: 14px; line-height: 1.6; color: #374151;">
            Hi ${esc(payload.fullName)}, your place is reserved. Complete the M-Pesa payment of
            <strong>KES ${amount}</strong> to confirm your slot.
          </p>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; line-height: 1.8; margin-top: 12px;">
            <tr><td style="color:#6b7280;">Date</td><td>${esc(event.date)}</td></tr>
            <tr><td style="color:#6b7280;">Time</td><td>${esc(event.time || "To be announced")}</td></tr>
            <tr><td style="color:#6b7280;">Meeting point</td><td>${esc(event.location || "To be announced")}</td></tr>
            <tr><td style="color:#6b7280;">Ticket</td><td>${esc(tier.label)} &middot; KES ${amount}</td></tr>
            <tr><td style="color:#6b7280;">Reg. No.</td><td>${esc(payload.registrationNumber)}</td></tr>
          </table>
          <p style="font-size: 12px; color: #6b7280; margin-top: 18px;">
            Dedan Kimathi Wildlife &amp; Environmental Club &middot; ${CLUB_EMAIL}
          </p>
        </div>
      `;
      const clubHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; color: #111827;">
          <h2 style="color: #064e3b; margin: 0 0 12px 0; font-size: 19px; font-weight: 800;">New event registration</h2>
          <p style="font-size: 14px; line-height: 1.9; margin: 0;">
            <strong>${esc(event.title)}</strong><br/>
            ${esc(payload.fullName)} &middot; ${esc(payload.registrationNumber)}<br/>
            ${esc(studentEmail)} &middot; ${esc(safePhone)}<br/>
            ${esc(tier.label)} &middot; KES ${amount}
          </p>
        </div>
      `;
      const results = await Promise.allSettled([
        sendEmail({
          to: studentEmail,
          subject: `Registration received - ${event.title}`,
          htmlContent: mailHtml,
        }),
        sendEmail({
          to: CLUB_EMAIL,
          subject: `New registration - ${event.title} (${payload.fullName})`,
          htmlContent: clubHtml,
        }),
      ]);
      results.forEach((result) => {
        if (result.status === "rejected") console.error("Event registration email failed:", result.reason);
      });
    }

    return NextResponse.json(
      {
        registrationId: String(registration._id),
        clerkId,
        amount,
        tierLabel: tier.label,
        reference: event.title,
        isFree: !!event.isFree,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Public event registration error:", error);
    return NextResponse.json({ error: "Failed to register for this event." }, { status: 500 });
  }
}
