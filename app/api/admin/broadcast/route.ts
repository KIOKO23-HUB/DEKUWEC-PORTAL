import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Member from "@/models/Member";
import Notification from "@/models/Notification";
import { sendEmail } from "@/lib/brevo";
import { clerkClient } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  try {
    const { title, message, imageUrl, link } = await req.json();
    await connectToDatabase();

    // 1. Fetch ALL users who have ever signed in directly from Clerk
    const client = await clerkClient();
    const userList = await client.users.getUserList();
    
    // 2. Extract their emails and format them exactly how the Brevo API requires
    const validEmails = userList.data
      .map(user => user.emailAddresses[0]?.emailAddress)
      .filter(Boolean);

    // Brevo requires BCC as an array of objects: [{ email: "..." }]
    const bccList = validEmails.map(email => ({ email }));

    // 3. Send the In-App Notifications (using MongoDB Members)
    const registeredMembers = await Member.find({}, 'clerkId');
    if (registeredMembers.length > 0) {
      const notifications = registeredMembers.map(member => ({
        clerkId: member.clerkId,
        title: `📢 ${title}`,
        message: message,
        type: "admin_alert"
      }));
      await Notification.insertMany(notifications);
    }

    // 4. Construct and Send the Mass Email
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #064e3b;">
        <h2 style="color: #059669;">${title}</h2>
        ${imageUrl ? `<img src="${imageUrl}" alt="Announcement Image" style="max-width: 100%; border-radius: 8px; margin-bottom: 15px;" />` : ''}
        <div style="background-color: #ecfdf5; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #a7f3d0; white-space: pre-wrap;">${message}</div>
        ${link ? `<a href="${link}" style="display: inline-block; background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Details</a>` : ''}
        <br/><br/>
        <p>Best regards,<br/><strong>DEKUWEC Executive Board</strong></p>
      </div>
    `;

    if (bccList.length > 0) {
      await sendEmail({
        to: [{ email: "wildlifeandenvironmentalclub@students.dekut.ac.ke", name: "DEKUWEC Members" }],
        bcc: bccList, 
        subject: `DEKUWEC Update: ${title}`,
        htmlContent: emailHtml,
      } as any);
    }

    return NextResponse.json({ message: "Broadcast sent successfully" }, { status: 200 });
  } catch (error) {
    console.error("Broadcast Error:", error);
    return NextResponse.json({ error: "Failed to send broadcast" }, { status: 500 });
  }
}
