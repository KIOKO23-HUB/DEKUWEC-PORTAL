import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Member from "@/models/Member";
import Notification from "@/models/Notification";
import { sendEmail } from "@/lib/brevo";

export async function POST(req: Request) {
  try {
    const { title, message, imageUrl, link } = await req.json();
    await connectToDatabase();

    const allMembers = await Member.find({}, 'clerkId email displayName');

    // 1. Bulk Create Notifications for everyone
    const notifications = allMembers.map(member => ({
      clerkId: member.clerkId,
      title: `📢 ${title}`,
      message: message,
      type: "admin_alert"
    }));
    await Notification.insertMany(notifications);

    // 2. Draft Mass Email
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; color: #064e3b;">
        <h2 style="color: #059669;">${title}</h2>
        ${imageUrl ? `<img src="${imageUrl}" alt="Announcement Image" style="max-width: 100%; border-radius: 8px; margin-bottom: 15px;" />` : ''}
        <div style="background-color: #ecfdf5; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #a7f3d0; white-space: pre-wrap;">${message}</div>
        ${link ? `<a href="${link}" style="display: inline-block; background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Details</a>` : ''}
        <br/><br/>
        <p>Best regards,<br/><strong>DEKUWEC Executive Board</strong></p>
      </div>
    `;

    // 3. Send BCC Email to all members (to protect privacy)
    const emails = allMembers.map(m => m.email).filter(Boolean);
    if (emails.length > 0) {
      // Note: Brevo allows sending to an array of emails. Ensure your Brevo tier supports mass sending.
      await sendEmail({
        to: "wildlifeandenvironmentalclub@students.dekut.ac.ke", // Send to club email, BCC others
        bcc: emails, 
        subject: `DEKUWEC Update: ${title}`,
        htmlContent: emailHtml,
      });
    }

    return NextResponse.json({ message: "Broadcast sent successfully" }, { status: 200 });
  } catch (error) {
    console.error("Broadcast Error:", error);
    return NextResponse.json({ error: "Failed to send broadcast" }, { status: 500 });
  }
}
