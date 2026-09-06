import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import EventRegistration from "@/models/EventRegistration";
import { sendEmail } from "@/lib/brevo";
import Notification from "@/models/Notification";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { clerkId, fullName, phone, registrationNumber, regNo, email, eventName } = body;

    const studentName = fullName || body.name || "DEKUWEC Member";
    const studentRegNo = registrationNumber || regNo || "";
    const studentPhone = phone || "";

    if (!eventName) {
      return NextResponse.json({ error: "Event name is required." }, { status: 400 });
    }

    await connectToDatabase();

    // Prevent duplicate entries for the same event
    const duplicateQuery: any[] = [];
    if (clerkId) duplicateQuery.push({ clerkId, eventName });
    if (studentRegNo) duplicateQuery.push({ registrationNumber: studentRegNo, eventName });

    if (duplicateQuery.length > 0) {
      const existing = await EventRegistration.findOne({ $or: duplicateQuery });
      if (existing) {
        return NextResponse.json({ error: "You are already registered for this event." }, { status: 400 });
      }
    }

    // Save registration to database
    const newRegistration = await EventRegistration.create({
      clerkId: clerkId || "",
      fullName: studentName,
      phone: studentPhone,
      registrationNumber: studentRegNo,
      email: email || "",
      eventName: eventName,
    });

    // Safe Brevo email dispatch
    if (email) {
      try {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #064e3b;">
            <h2 style="color: #059669;">Event Registration Confirmed! 🌳</h2>
            <p>Hello ${studentName},</p>
            <p>You have successfully registered for <strong>${eventName}</strong>.</p>
            <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #34d399;">
              <p style="margin: 0; color: #064e3b;"><strong>Reg No:</strong> ${studentRegNo || "N/A"}<br/><strong>Phone:</strong> ${studentPhone || "N/A"}</p>
            </div>
            <p>See you at the meeting point on time!</p>
            <br/>
            <p>Best regards,<br/><strong>DEKUWEC Executive Board</strong></p>
          </div>
        `;
        await sendEmail({
          to: email,
          subject: `Registration Confirmed: ${eventName}`,
          htmlContent: emailHtml,
        });
      } catch (emailErr) {
        console.warn("Registration saved, but Brevo email delivery failed:", emailErr);
      }
    }

    // Safe In-App Notification
    if (clerkId) {
      try {
        await Notification.create({
          clerkId,
          title: "Event RSVP Confirmed 🌳",
          message: `You are registered for ${eventName}. Check your email for details.`,
          type: "event"
        });
      } catch (notifErr) {
        console.warn("Notification creation skipped:", notifErr);
      }
    }

    return NextResponse.json({ message: "Registration successful!", data: newRegistration }, { status: 201 });
  } catch (error: any) {
    console.error("Event Registration Failure:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process registration" },
      { status: 500 }
    );
  }
}
