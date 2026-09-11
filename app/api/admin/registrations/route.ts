import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import mongoose from "mongoose";
import { sendEmail } from "@/lib/brevo";
import Notification from "@/models/Notification";

// SILVER BULLET: Flexible schema bypasses strict mode crashes for new fields
const FlexibleSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const EventReg = mongoose.models.RegBypass || mongoose.model("RegBypass", FlexibleSchema, "eventregistrations");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Extract all fields, including the new payment fields
    const { clerkId, fullName, phone, phoneNumber, registrationNumber, email, eventName, paymentStatus, amountPaid } = body;
    
    // Support both 'phone' and 'phoneNumber' based on what the frontend sends
    const resolvedPhone = phoneNumber || phone;

    if (!eventName || !fullName || !resolvedPhone || !registrationNumber) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectToDatabase();

    // 1. Check if user is already registered
    const existingRegistration = await EventReg.findOne({ 
      $or: [{ clerkId: clerkId }, { registrationNumber: registrationNumber }],
      eventName: eventName 
    });

    // 2. Save or Update Registration to MongoDB safely
    // We use findOneAndUpdate so that when M-Pesa is active later, we can update them to "Paid" without throwing a duplicate error!
    const registration = await EventReg.findOneAndUpdate(
      { 
        $or: [{ clerkId: clerkId }, { registrationNumber: registrationNumber }],
        eventName: eventName 
      },
      { 
        $set: {
          clerkId,
          fullName, 
          phoneNumber: resolvedPhone, 
          phone: resolvedPhone,
          registrationNumber, 
          email: email || "no-email@provided.com",
          eventName,
          paymentStatus: paymentStatus || "Not Yet Paid", 
          amountPaid: amountPaid || 0,
          updatedAt: new Date()
        }
      },
      { upsert: true, new: true }
    );

    // 3. Draft & Send Confirmation Email (ONLY if this is their first time applying)
    if (!existingRegistration) {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; color: #064e3b;">
          <h2 style="color: #059669;">Event Registration Confirmed! 🌳</h2>
          <p>Hello ${fullName},</p>
          <p>You have successfully registered for the <strong>${eventName}</strong>.</p>
          
          <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #34d399;">
            <p style="margin: 0; color: #064e3b;">Please ensure you arrive at the specified meeting point on time. If there are any updates regarding weather or transport, we will notify you via this email.</p>
          </div>

          <p>We are excited to see you there!</p>
          <br/>
          <p>Best regards,<br/><strong>DEKUWEC Executive Board</strong></p>
        </div>
      `;

      // 4. Send Email via Brevo (Fixed Array Format)
      try {
        if (email && email !== "no-email@provided.com") {
          await sendEmail({
            to: [{ email: email, name: fullName }],
            subject: `Registration Confirmed: ${eventName}`,
            htmlContent: emailHtml,
          } as any);
          console.log(`Event registration email dispatched to ${email}`);
        }
      } catch (emailError) {
        console.error("Warning: Registration saved, but email failed.", emailError);
      }

      // 5. Create In-App Notification
      if (clerkId) {
        await Notification.create({
          clerkId,
          title: "Event RSVP Confirmed 🌳",
          message: `You are officially registered for the ${eventName}. See you there!`,
          type: "event"
        });
      }
    }

    return NextResponse.json(
      { message: "Successfully registered for the event!" },
      { status: 201 }
    );

  } catch (error: any) {
    console.error("Event Registration Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process registration" },
      { status: 500 }
    );
  }
}