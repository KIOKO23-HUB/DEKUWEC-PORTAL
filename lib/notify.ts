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
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          @keyframes dekuwec-rise {
            from { opacity: 0; transform: translateY(14px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes dekuwec-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.55; }
          }
          .dekuwec-card { animation: dekuwec-rise 620ms ease both; }
          .dekuwec-dot { animation: dekuwec-pulse 2.4s ease-in-out infinite; }
          @media (max-width: 600px) {
            .dekuwec-shell { margin: 0 !important; border-radius: 0 !important; }
            .dekuwec-title { font-size: 20px !important; }
          }
        </style>
      </head>
      <body style="margin:0;background:#eef7f1;font-family:Inter,Arial,sans-serif;color:#16352a;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${message.slice(0, 120)}</div>
        <div class="dekuwec-shell dekuwec-card" style="max-width:620px;margin:24px auto;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #d8eadf;">
          <div style="background:linear-gradient(135deg,#064e3b,#059669);padding:24px 28px;color:white;">
            <p style="margin:0;font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#bbf7d0;">
              DEKUWEC <span class="dekuwec-dot" style="color:#b8f36b;">●</span> EcoPulse
            </p>
            <h1 class="dekuwec-title" style="margin:8px 0 0;font-size:24px;line-height:1.25;color:#ffffff;">${title}</h1>
          </div>
          ${imageUrl ? `<img src="${imageUrl}" alt="DEKUWEC update" style="display:block;width:100%;max-height:280px;object-fit:cover;" />` : ""}
          <div style="padding:28px;">
            <div style="background:#f3faf6;border-left:4px solid #10b981;padding:16px 18px;border-radius:10px;line-height:1.65;white-space:pre-wrap;">${message}</div>
            ${actionUrl ? `<a href="${actionUrl}" style="display:inline-block;margin-top:22px;background:#064e3b;color:white;padding:13px 20px;text-decoration:none;border-radius:10px;font-weight:800;">View update →</a>` : ""}
            <p style="margin-top:28px;padding-top:18px;border-top:1px solid #e5eee8;font-size:13px;color:#64748b;">Keep exploring, protecting, and sharing nature.<br/><strong style="color:#064e3b;">DEKUWEC Executive Board</strong></p>
          </div>
        </div>
      </body>
    </html>
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
