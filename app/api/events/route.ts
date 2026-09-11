import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import EventRegistration from "@/models/EventRegistration";
import { sendEmail } from "@/lib/brevo";
import Notification from "@/models/Notification";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Extract the fields including the newly added phoneNumber
    const { clerkId, fullName, phoneNumber, registrationNumber, email, eventName } = body;

    if (!eventName || !fullName || !phoneNumber || !registrationNumber) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectToDatabase();

    // 1. Check if user is already registered for this specific event
    // Checks both clerkId AND registrationNumber to prevent duplicate signups
    const existingRegistration = await EventRegistration.findOne({ 
      $or: [{ clerkId: clerkId }, { registrationNumber: registrationNumber }],
      eventName: eventName 
    });
    
    if (existingRegistration) {
      return NextResponse.json(
        { error: "You are already registered for this event." },
        { status: 400 }
      );
    }

    // 2. Save Registration to MongoDB
    const newRegistration = new EventRegistration({
      clerkId,
      fullName, 
      phoneNumber, // Saves as a dedicated database column now
      registrationNumber, 
      email,
      eventName,
    });
    
    await newRegistration.save();

    // 3. Draft Confirmation Email
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

    // 4. Send Email via Brevo
    try {
      if (email) {
        await sendEmail({
          to: email,
          subject: `Registration Confirmed: ${eventName}`,
          htmlContent: emailHtml,
        });
        console.log(`Event registration email dispatched to ${email}`);
      }
    } catch (emailError) {
      console.error("Warning: Registration saved, but email failed.", emailError);
    }

    // 5. Create In-App Notification
    await Notification.create({
      clerkId,
      title: "Event RSVP Confirmed 🌳",
      message: `You are officially registered for the ${eventName}. See you there!`,
      type: "event"
    });

    return NextResponse.json(
      { message: "Successfully registered for the event!" },
      { status: 201 }
    );

  } catch (error) {
    console.error("Event Registration Error:", error);
    return NextResponse.json(
      { error: "Failed to process registration" },
      { status: 500 }
    );
  }
}
