import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Member from "@/models/Member";
import Notification from "@/models/Notification";
import { sendEmail } from "@/lib/brevo";
//next.js
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { clerkId, email, fullName } = await req.json();
    await connectToDatabase();

    // 1. Update Member Status
    const member = await Member.findOneAndUpdate(
      { clerkId },
      { status: "Registered Member" }, // Updated to match the frontend UI perfectly
      { new: true }
    );

    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    // 2. Create Notification
    await Notification.create({
      clerkId,
      title: "Membership Approved! ✅",
      message: "Your DEKUWEC membership has been officially approved by the treasury. Welcome aboard!",
      type: "membership"
    });

    // 3. Send Email
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; color: #064e3b;">
        <h2 style="color: #059669;">You are officially a member! 🎉</h2>
        <p>Hello ${fullName},</p>
        <p>Your DEKUWEC membership fee has been verified and your account is now fully approved.</p>
        <p>You can now access all portal features, apply for your WCK card, and RSVP for upcoming excursions.</p>
        <br/>
        <p>Best regards,<br/><strong>DEKUWEC Executive Board</strong></p>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: "Your DEKUWEC Membership is Approved!",
      htmlContent: emailHtml,
    });

    return NextResponse.json({ message: "Member approved successfully" }, { status: 200 });
  } catch (error) {
    console.error("Approval Error:", error);
    return NextResponse.json({ error: "Failed to approve member" }, { status: 500 });
  }
}
