import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Notification from "@/models/Notification";
import { sendEmail } from "@/lib/brevo";
import { clerkClient } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  try {
    const { title, message, imageUrl, link } = await req.json();
    
    if (!title || !message) {
      return NextResponse.json({ error: "Title and message are required." }, { status: 400 });
    }

    await connectToDatabase();

    // 1. Fetch ALL users who have ever signed in directly from Clerk (up to 500)
    const client = await clerkClient();
    const userList = await client.users.getUserList({ limit: 500 });
    
    // 2. Prepare mass operations
    const emailPromises: Promise<any>[] = [];
    const notificationDocs: any[] = [];

    // --- FIX: Ensure the link is a full, valid URL for Brevo ---
    // Using your exact live Vercel link as the base URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dekuwec-portal-k2p9.vercel.app";

    let actionUrl = "";
    if (link) {
      // If the link already starts with http/https, use it as is.
      if (link.startsWith("http://") || link.startsWith("https://")) {
        actionUrl = link;
      } else {
        // Otherwise, prepend the base URL, ensuring no double slashes.
        actionUrl = `${baseUrl.replace(/\/$/, "")}/${link.replace(/^\//, "")}`;
      }
    }
    // -----------------------------------------------------------

    // 3. Construct the HTML Email with Image Support
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #064e3b;">
        <h2 style="color: #059669;">${title}</h2>
        ${imageUrl ? `<img src="${imageUrl}" alt="Announcement Image" style="max-width: 100%; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" />` : ''}
        <div style="background-color: #ecfdf5; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #a7f3d0; white-space: pre-wrap;">${message}</div>
        ${actionUrl ? `<a href="${actionUrl}" style="display: inline-block; background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Details / Action Link</a>` : ''}
        <br/><br/>
        <p>Best regards,<br/><strong>DEKUWEC Executive Board</strong></p>
      </div>
    `;

    // 4. Build the Dispatch Lists for EVERY user in the Clerk system
    userList.data.forEach(user => {
      // Queue In-App Notification
      notificationDocs.push({
        clerkId: user.id,
        title: `📢 ${title}`,
        message: message,
        type: "broadcast",
        link: link || "/dashboard", // It's fine for in-app notifications to use relative links
        isRead: false,
        createdAt: new Date()
      });

      // Queue Direct Email
      const userEmail = user.emailAddresses[0]?.emailAddress;
      if (userEmail) {
        emailPromises.push(
          sendEmail({
            to: [{ email: userEmail, name: user.firstName || "Member" }], // Brevo strict array requirement
            subject: `DEKUWEC Update: ${title}`,
            htmlContent: emailHtml,
          } as any)
        );
      }
    });

    // 5. Execute Mass Operations Safely
    // Promise.allSettled ensures that if one email bounces, the script continues sending the rest
    await Promise.allSettled(emailPromises);
    
    // Insert all notifications in one swift database transaction
    if (notificationDocs.length > 0) {
      await Notification.insertMany(notificationDocs);
    }

    return NextResponse.json({ message: "Broadcast sent successfully to all members" }, { status: 200 });
  } catch (error) {
    console.error("Broadcast Error:", error);
    return NextResponse.json({ error: "Failed to send broadcast" }, { status: 500 });
  }
}