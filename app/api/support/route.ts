import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Inquiry from "@/models/Inquiry";
import { sendEmail } from "@/lib/brevo";
import Notification from "@/models/Notification";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { clerkId, fullName, email, subject, message } = body;

    // 1. Connect to Database
    await connectToDatabase();

    // 2. Save Inquiry to MongoDB
    const newInquiry = new Inquiry({
      clerkId,
      fullName,
      email,
      subject,
      message,
    });
    
    await newInquiry.save();

    // 3. Draft Both Emails (One for user, one for Admin)
    const userEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; color: #064e3b;">
        <h2 style="color: #059669;">We received your message! 📨</h2>
        <p>Hello ${fullName},</p>
        <p>This is an automated confirmation that DEKUWEC has received your inquiry regarding <strong>"${subject}"</strong>.</p>
        <p>Our executive team will review your message and get back to you shortly.</p>
        <br/>
        <p>Best regards,<br/><strong>DEKUWEC Executive Board</strong></p>
      </div>
    `;

    const adminEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; color: #111827;">
        <h2 style="color: #059669;">New Support Inquiry</h2>
        <p><strong>From:</strong> ${fullName} (${email})</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
          <p style="white-space: pre-wrap;">${message}</p>
        </div>
        <p><em>Reply directly to ${email} to answer this inquiry.</em></p>
      </div>
    `;

    // 4. Send Emails via Brevo
    try {
      // 4a. Auto-reply to the student
      await sendEmail({
        to: email,
        subject: `Re: ${subject} - DEKUWEC Support`,
        htmlContent: userEmailHtml,
      });

      // 4b. Forward the actual inquiry to the Club Admin
      if (process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
        await sendEmail({
          to: process.env.NEXT_PUBLIC_ADMIN_EMAIL,
          subject: `Action Required: New Student Inquiry - ${subject}`,
          htmlContent: adminEmailHtml,
        });
      }
      
      console.log("Support emails dispatched successfully.");
    } catch (emailError) {
      console.error("Warning: Inquiry saved, but email dispatch failed.", emailError);
    }

    // 5. Create In-App Notification
    await Notification.create({
      clerkId,
      title: "Inquiry Sent 📨",
      message: `We received your message regarding "${subject}". The executive board will review it soon.`,
      type: "support"
    });

    return NextResponse.json(
      { message: "Inquiry submitted successfully", inquiry: newInquiry },
      { status: 201 }
    );

  } catch (error) {
    console.error("Support Inquiry Error:", error);
    return NextResponse.json(
      { error: "Failed to process inquiry" },
      { status: 500 }
    );
  }
}
