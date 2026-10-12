import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import LeadershipApplication, {
  LEADERSHIP_ROLES,
  LEADERSHIP_REQUIREMENTS,
} from "@/models/LeadershipApplication";
import LeadershipConfig, { LEADERSHIP_SEASON } from "@/models/LeadershipConfig";
import Notification from "@/models/Notification";
import { sendEmail } from "@/lib/brevo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://dekuwec.app";

async function getLeadershipConfig() {
  const existing = await LeadershipConfig.findOne({ season: LEADERSHIP_SEASON });
  if (existing) return existing;
  return LeadershipConfig.create({ season: LEADERSHIP_SEASON });
}

export async function GET() {
  try {
    await connectToDatabase();
    const [applications, config] = await Promise.all([
      LeadershipApplication.find({}).sort({ createdAt: -1 }),
      getLeadershipConfig(),
    ]);

    return NextResponse.json(
      { applications, config, roles: LEADERSHIP_ROLES, requirements: LEADERSHIP_REQUIREMENTS },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin Leadership GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch leadership applications" }, { status: 500 });
  }
}

// Approve or reject an application. Approvals trigger the notification email.
export async function PATCH(req: Request) {
  try {
    const { id, status, reviewNote } = await req.json();

    if (!id || !["Approved", "Rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid application or status" }, { status: 400 });
    }

    await connectToDatabase();

    const application = await LeadershipApplication.findByIdAndUpdate(
      id,
      { status, reviewNote: reviewNote || "", reviewedAt: new Date() },
      { new: true }
    );

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const approved = status === "Approved";
    const config = await getLeadershipConfig();

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; color: #111827;">
        <h2 style="color: ${approved ? "#064e3b" : "#9f1239"}; margin: 0 0 6px 0; font-size: 22px; font-weight: 800;">
          ${approved ? "Your Leadership Application Is Approved!" : "Leadership Application Update"}
        </h2>
        <p style="font-size: 13px; font-weight: bold; color: #059669; margin: 0 0 18px 0;">DEKUWEC Leadership Elections ${LEADERSHIP_SEASON}</p>

        <p style="font-size: 14px; line-height: 1.6; color: #374151;">Hello <strong>${application.fullName}</strong>,</p>
        ${
          approved
            ? `<p style="font-size: 14px; line-height: 1.6; color: #374151;">
                 Congratulations! The Executive Board has <strong>approved</strong> your application to run for the position of
                 <strong>${application.role}</strong>. Your candidate profile is now published on the DEKUWEC portal under
                 the leadership applicants for that category, where members can view your responses and leave impressions.
               </p>`
            : `<p style="font-size: 14px; line-height: 1.6; color: #374151;">
                 Thank you for applying to run for the position of <strong>${application.role}</strong>. After review, your
                 application was not successful this season.
               </p>`
        }

        ${
          application.reviewNote
            ? `<div style="background-color: #f9fafb; border-left: 4px solid ${approved ? "#059669" : "#e11d48"}; border-radius: 8px; padding: 16px; margin: 18px 0;">
                 <p style="margin: 0; font-size: 14px; color: #1f2937; white-space: pre-wrap;">${application.reviewNote}</p>
               </div>`
            : ""
        }

        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin: 22px 0; font-size: 14px; line-height: 1.8; color: #065f46;">
          <p style="margin: 0 0 8px 0; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em;">Key Dates</p>
          <p style="margin: 0;"><strong>Debate &amp; Interrogation:</strong> ${config.debateDate || "To be announced"}</p>
          <p style="margin: 0;"><strong>Campaigns &amp; Petitions:</strong> ${config.campaignDate || "To be announced"}</p>
          <p style="margin: 0;"><strong>Election Day (Physical Voting):</strong> ${config.electionDate || "To be announced"}</p>
          ${config.venue ? `<p style="margin: 0;"><strong>Venue:</strong> ${config.venue}</p>` : ""}
        </div>

        <div style="margin: 22px 0 12px 0;">
          <a href="${BASE_URL}/dashboard/support" style="background-color: #064e3b; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-size: 13px; font-weight: bold; display: inline-block;">
            Open Leadership Applicants
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 22px 0;" />
        <p style="font-size: 12px; color: #6b7280; margin: 0;">
          Dedan Kimathi Wildlife &amp; Environmental Club<br/>
          Dedan Kimathi University of Technology, Nyeri, Kenya
        </p>
      </div>
    `;

    try {
      await sendEmail({
        to: application.email,
        subject: approved
          ? `Approved: Your DEKUWEC Leadership Application (${application.role})`
          : `Update: Your DEKUWEC Leadership Application (${application.role})`,
        htmlContent: emailHtml,
      });
    } catch (emailError) {
      console.error("Warning: application status updated, but the email failed.", emailError);
    }

    try {
      await Notification.create({
        clerkId: application.clerkId,
        title: approved ? "Leadership Application Approved" : "Leadership Application Update",
        message: approved
          ? `You are now an official candidate for ${application.role}. Your profile is live on the portal.`
          : `Your application for ${application.role} was not successful this season.`,
        type: "leadership",
        link: "/dashboard/support",
      });
    } catch (notifError) {
      console.error("Failed to create leadership notification:", notifError);
    }

    return NextResponse.json({ message: `Application ${status.toLowerCase()}`, application }, { status: 200 });
  } catch (error) {
    console.error("Admin Leadership PATCH Error:", error);
    return NextResponse.json({ error: "Failed to update application" }, { status: 500 });
  }
}

// Saves the debate, campaign and election dates for the season
export async function PUT(req: Request) {
  try {
    const { debateDate, campaignDate, electionDate, venue, notes, applicationsOpen } = await req.json();

    await connectToDatabase();

    const config = await LeadershipConfig.findOneAndUpdate(
      { season: LEADERSHIP_SEASON },
      {
        season: LEADERSHIP_SEASON,
        debateDate: debateDate ?? "",
        campaignDate: campaignDate ?? "",
        electionDate: electionDate ?? "",
        venue: venue ?? "",
        notes: notes ?? "",
        applicationsOpen: applicationsOpen !== false,
      },
      { new: true, upsert: true }
    );

    return NextResponse.json({ message: "Election timeline saved", config }, { status: 200 });
  } catch (error) {
    console.error("Admin Leadership PUT Error:", error);
    return NextResponse.json({ error: "Failed to save election timeline" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing application id" }, { status: 400 });
    }

    await connectToDatabase();
    await LeadershipApplication.findByIdAndDelete(id);

    return NextResponse.json({ message: "Application removed" }, { status: 200 });
  } catch (error) {
    console.error("Admin Leadership DELETE Error:", error);
    return NextResponse.json({ error: "Failed to remove application" }, { status: 500 });
  }
}
