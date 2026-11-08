import { clerkClient } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import Notification from "@/models/Notification";
import Member from "@/models/Member";
import { isGuestClerkId } from "@/lib/members";
import { sendEmail } from "@/lib/brevo";

const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL || "https://dekuwec.app").replace(/\/$/, "");

export const absoluteLink = (link?: string) => {
  if (!link) return "";
  if (link.startsWith("http://") || link.startsWith("https://")) return link;
  return `${appUrl()}/${link.replace(/^\//, "")}`;
};

export function notificationEmailHtml({
  title,
  message,
  imageUrl,
  link,
}: {
  title: string;
  message: string;
  imageUrl?: string;
  link?: string;
}) {
  const actionUrl = absoluteLink(link);
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #064e3b;">
      <h2 style="color: #059669;">${title}</h2>
      ${imageUrl ? `<img src="${imageUrl}" alt="DEKUWEC update" style="max-width: 100%; border-radius: 8px; margin-bottom: 15px;" />` : ""}
      <div style="background-color: #ecfdf5; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #a7f3d0; white-space: pre-wrap;">${message}</div>
      ${actionUrl ? `<a href="${actionUrl}" style="display: inline-block; background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Details</a>` : ""}
      <br/><br/>
      <p>Best regards,<br/><strong>DEKUWEC Executive Board</strong></p>
    </div>
  `;
}

type NotifyAllInput = {
  title: string;
  message: string;
  link?: string;
  imageUrl?: string;
  excludeClerkIds?: string[];
};

/**
 * Sends an in-app notification and an email to every account and every
 * email-only subscriber in the member directory.
 */
export async function notifyAllMembers({
  title,
  message,
  link,
  imageUrl,
  excludeClerkIds = [],
}: NotifyAllInput) {
  await connectToDatabase();

  const excluded = new Set(excludeClerkIds.filter(Boolean));
  const notifications: Record<string, unknown>[] = [];
  const emails: Promise<unknown>[] = [];
  const emailedAddresses = new Set<string>();

  const queueEmail = (email?: string | null) => {
    const normalized = email?.trim().toLowerCase();
    if (!normalized || emailedAddresses.has(normalized)) return;
    emailedAddresses.add(normalized);
    emails.push(
      sendEmail({
        to: normalized,
        subject: `DEKUWEC Update: ${title}`,
        htmlContent: notificationEmailHtml({ title, message, imageUrl, link }),
      }).catch((err) => console.error("Broadcast email failed:", normalized, err))
    );
  };

  const client = await clerkClient();
  const userList = await client.users.getUserList({ limit: 500 });

  userList.data.forEach((user) => {
    if (excluded.has(user.id)) return;
    notifications.push({
      clerkId: user.id,
      title: `📢 ${title}`,
      message,
      type: "broadcast",
      link: link || "/dashboard",
      imageUrl: imageUrl || "",
      isRead: false,
    });
    queueEmail(user.emailAddresses[0]?.emailAddress);
  });

  // Email-only subscribers collected from the direct links.
  const directoryMembers = await Member.find({}).select("clerkId email").lean();
  directoryMembers.forEach((member: any) => {
    if (!isGuestClerkId(member.clerkId)) return;
    queueEmail(member.email);
  });

  await Promise.allSettled(emails);
  if (notifications.length > 0) {
    await Notification.insertMany(notifications);
  }

  return { notified: notifications.length, emailed: emailedAddresses.size };
}
