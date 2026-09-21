import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Inquiry from "@/models/Inquiry";
import { sendEmail } from "@/lib/brevo";
import Notification from "@/models/Notification";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { clerkId, fullName, email, subject, message } = body;

    if (!fullName || !email || !message) {
      return NextResponse.json(
        { error: "Full name, email, and message are required." },
        { status: 400 }
      );
    }

    // 1. Connect to Database
    await connectToDatabase();

    // 2. Save Inquiry to MongoDB
    const newInquiry = new Inquiry({
      clerkId: clerkId || "guest",
      fullName,
      email,
      subject: subject || "General Inquiry",
      message,
    });
    
    await newInquiry.save();

    const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://dekuwec.app";

    // 3. Draft Both Emails with Live Domain Links & Polished Layouts
    const userEmailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; color: #111827;">
        <div style="display: flex; align-items: center; margin-bottom: 20px;">
          <h2 style="color: #064e3b; margin: 0; font-size: 20px; font-weight: 800;">DEKUWEC Support</h2>
        </div>
        <h3 style="color: #059669; font-size: 18px; margin-top: 0;">We received your message! 📨</h3>
        <p style="font-size: 14px; line-height: 1.6; color: #374151;">Hello <strong>${fullName}</strong>,</p>
        <p style="font-size: 14px; line-height: 1.6; color: #374151;">
          This is an automated confirmation that the Dedan Kimathi Wildlife & Environmental Club has received your inquiry regarding <strong>"${subject || "General Inquiry"}"</strong>.
        </p>
        <div style="background-color: #f0fdf4; border-left: 4px solid #059669; padding: 14px 16px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-size: 13px; color: #065f46; font-style: italic; white-space: pre-wrap;">"${message}"</p>
        </div>
        <p style="font-size: 14px; line-height: 1.6; color: #374151;">
          Our executive board will review your inquiry and reply directly to this email address. You can also join our physical meetings on campus every Wednesday from 5:00 PM to 6:45 PM.
        </p>
        <div style="margin: 28px 0 16px 0;">
          <a href="${BASE_URL}" style="background-color: #064e3b; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-size: 13px; font-weight: bold; display: inline-block;">
            Visit DEKUWEC Portal
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="font-size: 12px; color: #6b7280; margin: 0;">
          Dedan Kimathi Wildlife & Environmental Club<br/>
          Dedan Kimathi University of Technology, Nyeri, Kenya<br/>
          <a href="${BASE_URL}" style="color: #059669; text-decoration: none;">dekuwec.app</a>
        </p>
      </div>
    `;

    const adminEmailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; color: #111827;">
        <h2 style="color: #064e3b; margin-top: 0; font-size: 20px; font-weight: 800;">New Support Inquiry</h2>
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 16px; border-radius: 12px; margin: 16px 0; font-size: 14px; line-height: 1.6;">
          <p style="margin: 0 0 6px 0;"><strong>From:</strong> ${fullName}</p>
          <p style="margin: 0 0 6px 0;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #059669;">${email}</a></p>
          <p style="margin: 0;"><strong>Subject:</strong> ${subject || "General Inquiry"}</p>
        </div>
        <div style="background-color: #f0fdf4; border-left: 4px solid #059669; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #1f2937; white-space: pre-wrap;">${message}</p>
        </div>
        <div style="margin: 24px 0;">
          <a href="mailto:${email}?subject=Re: ${encodeURIComponent(subject || "DEKUWEC Inquiry")}" style="background-color: #059669; color: #ffffff; text-decoration: none; padding: 12px 22px; border-radius: 10px; font-size: 13px; font-weight: bold; display: inline-block; margin-right: 10px;">
            Reply to ${fullName}
          </a>
          <a href="${BASE_URL}/admin" style="background-color: #f3f4f6; color: #1f2937; text-decoration: none; padding: 12px 22px; border-radius: 10px; font-size: 13px; font-weight: bold; display: inline-block; border: 1px solid #d1d5db;">
            Open Admin Dashboard
          </a>
        </div>
        <p style="font-size: 12px; color: #6b7280; margin-top: 24px;">
          Logged via DEKUWEC Portal Support Form on ${new Date().toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })} EAT.
        </p>
      </div>
    `;

    // 4. Send Emails via Brevo
    try {
      // 4a. Auto-reply to student
      await sendEmail({
        to: email,
        subject: `Re: ${subject || "Inquiry Received"} - DEKUWEC Support`,
        htmlContent: userEmailHtml,
      });

      // 4b. Forward to Club Admin
      if (process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
        await sendEmail({
          to: process.env.NEXT_PUBLIC_ADMIN_EMAIL,
          subject: `Action Required: New Student Inquiry - ${subject || "General"}`,
          htmlContent: adminEmailHtml,
        });
      }
      
      console.log("Support emails dispatched successfully via Brevo.");
    } catch (emailError) {
      console.error("Warning: Inquiry saved, but email dispatch failed.", emailError);
    }

    // 5. Create In-App Notification (only if user was logged in)
    if (clerkId && clerkId !== "guest") {
      try {
        await Notification.create({
          clerkId,
          title: "Inquiry Sent 📨",
          message: `We received your message regarding "${subject || "General Inquiry"}". The executive board will review it soon.`,
          type: "support",
          link: "/dashboard/support"
        });
      } catch (notifErr) {
        console.error("Failed to generate in-app notification:", notifErr);
      }
    }

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