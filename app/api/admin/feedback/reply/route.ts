import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Notification from "@/models/Notification";
import { sendEmail } from "@/lib/brevo";

export async function POST(req: Request) {
  try {
    const { clerkId, studentEmail, studentName, originalSubject, replyMessage } = await req.json();

    if (!studentEmail || !replyMessage) {
      return NextResponse.json({ error: "Email and reply message are required." }, { status: 400 });
    }

    await connectToDatabase();

    // 1. Construct and Send the Email via Brevo
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
        <h2 style="color: #059669;">Response to your inquiry: ${originalSubject || "DEKUWEC Support"}</h2>
        <p>Hello ${studentName || "Student"},</p>
        
        <p>Thank you for reaching out. Here is the response from the executive board:</p>
        
        <div style="background-color: #ecfdf5; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #34d399; white-space: pre-wrap; color: #064e3b;">${replyMessage}</div>
        
        <p>Best regards,<br/><strong>DEKUWEC Executive Board</strong></p>
      </div>
    `;

    await sendEmail({
      to: studentEmail,
      subject: `Re: ${originalSubject || "Your Inquiry"} - DEKUWEC Support`,
      htmlContent: emailHtml,
    });

    // 2. Create the In-App Notification 
    // We only create this if they are a registered user (not anonymous)
    if (clerkId && clerkId !== "anonymous") {
      await Notification.create({
        clerkId: clerkId,
        title: "Support Response Received 📨",
        message: `Your inquiry regarding "${originalSubject || "Support"}" has been answered. Please check your student email for the detailed response.`,
        type: "support",
        link: "/dashboard/support"
      });
    }

    return NextResponse.json({ message: "Reply sent successfully" }, { status: 200 });

  } catch (error) {
    console.error("Feedback Reply Error:", error);
    return NextResponse.json({ error: "Failed to send reply" }, { status: 500 });
  }
}