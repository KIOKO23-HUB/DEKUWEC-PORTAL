import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import LeadershipApplication, {
  LEADERSHIP_REQUIREMENTS,
  LEADERSHIP_ROLES,
} from "@/models/LeadershipApplication";
import LeadershipConfig, { LEADERSHIP_SEASON } from "@/models/LeadershipConfig";
import Member from "@/models/Member";
import Notification from "@/models/Notification";
import { sendEmail } from "@/lib/brevo";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://dekuwec.app";

// Loads the admin controlled timeline, creating the default season document on first run
async function getLeadershipConfig() {
  const existing = await LeadershipConfig.findOne({ season: LEADERSHIP_SEASON });
  if (existing) return existing;
  return LeadershipConfig.create({ season: LEADERSHIP_SEASON });
}

function timelineRows(config: any) {
  const rows = [
    { title: "Debate & Interrogation", date: config?.debateDate, icon: "&#127908;" },
    { title: "Campaigns & Petitions", date: config?.campaignDate, icon: "&#128227;" },
    { title: "Election Day (Physical Voting)", date: config?.electionDate, icon: "&#128499;" },
  ];
  return rows
    .map(
      (row) => `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #111827;">
            ${row.icon} <strong>${row.title}</strong>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: ${
            row.date ? "#065f46" : "#b45309"
          }; font-weight: bold; text-align: right;">
            ${row.date || "Date to be announced by the Executive Board"}
          </td>
        </tr>`
    )
    .join("");
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const clerkId = searchParams.get("clerkId");

    await connectToDatabase();
    const config = await getLeadershipConfig();

    // Only approved applicants are published on the portal
    const approved = await LeadershipApplication.find({ status: "Approved" }).sort({
      impressions: -1,
      createdAt: 1,
    });

    const applicants = approved.map((app) => ({
      _id: app._id,
      fullName: app.fullName,
      regNo: app.regNo,
      role: app.role,
      motivation: app.motivation,
      newIdeas: app.newIdeas,
      heldPositionBefore: app.heldPositionBefore,
      previousRole: app.previousRole,
      impressions: app.impressions,
      impressedBy: app.impressedBy,
      createdAt: app.createdAt,
    }));

    let myApplication = null;
    if (clerkId) {
      myApplication = await LeadershipApplication.findOne({ clerkId });
    }

    return NextResponse.json(
      {
        applicants,
        myApplication,
        config,
        season: LEADERSHIP_SEASON,
        roles: LEADERSHIP_ROLES,
        requirements: LEADERSHIP_REQUIREMENTS,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Leadership GET Error:", error);
    return NextResponse.json({ error: "Failed to load leadership data" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      clerkId,
      fullName,
      regNo,
      email,
      role,
      motivation,
      newIdeas,
      heldPositionBefore,
      previousRole,
      confirmedRequirements,
    } = body;

    if (!clerkId) {
      return NextResponse.json({ error: "You must be signed in to apply." }, { status: 401 });
    }

    if (!fullName || !regNo || !email || !role || !motivation || !newIdeas) {
      return NextResponse.json(
        { error: "Name, registration number, student email, role and your responses are required." },
        { status: 400 }
      );
    }

    if (!confirmedRequirements) {
      return NextResponse.json(
        { error: "You must confirm that you meet all the leadership requirements." },
        { status: 400 }
      );
    }

    if (!LEADERSHIP_ROLES.includes(role)) {
      return NextResponse.json({ error: "Please select a valid leadership position." }, { status: 400 });
    }

    await connectToDatabase();
    const config = await getLeadershipConfig();

    if (!config.applicationsOpen) {
      return NextResponse.json(
        { error: "Leadership applications for this season are currently closed." },
        { status: 403 }
      );
    }

    // Cross-check the applicant against the membership register
    const memberDoc = await Member.findOne({ clerkId });
    const isRegisteredMember =
      !!memberDoc && ["Registered Member", "Approved"].includes(memberDoc.status || "");

    const existing = await LeadershipApplication.findOne({ clerkId });
    if (existing && existing.status !== "Rejected") {
      return NextResponse.json(
        {
          error:
            existing.status === "Approved"
              ? "Your leadership application has already been approved."
              : "You already have a leadership application awaiting review.",
        },
        { status: 409 }
      );
    }

    const payload = {
      clerkId,
      fullName,
      regNo,
      email,
      role,
      motivation,
      newIdeas,
      heldPositionBefore: !!heldPositionBefore,
      previousRole: heldPositionBefore ? previousRole || "" : "",
      confirmedRequirements: true,
      isRegisteredMember,
      memberStatus: memberDoc?.status || "Not Registered",
      status: "Pending Review",
      reviewNote: "",
      reviewedAt: null,
    };

    const application = existing
      ? await LeadershipApplication.findByIdAndUpdate(
          existing._id,
          { ...payload, impressions: 0, impressedBy: [] },
          { new: true }
        )
      : await LeadershipApplication.create(payload);

    // Congratulatory receipt email containing every response the applicant submitted
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; color: #111827;">
        <h2 style="color: #064e3b; margin: 0 0 4px 0; font-size: 22px; font-weight: 800;">Congratulations, ${fullName}!</h2>
        <p style="font-size: 13px; font-weight: bold; color: #059669; margin: 0 0 18px 0;">DEKUWEC Leadership Application ${LEADERSHIP_SEASON}</p>

        <p style="font-size: 14px; line-height: 1.6; color: #374151;">
          Your application to serve as <strong>${role}</strong> in the Dedan Kimathi Wildlife &amp; Environmental Club
          executive board has been received successfully. The Executive Board will review it and you will be notified
          by email once a decision is made.
        </p>

        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 14px; line-height: 1.7;">
          <p style="margin: 0 0 8px 0; font-weight: 800; color: #064e3b; text-transform: uppercase; font-size: 11px; letter-spacing: 0.06em;">Your Submitted Responses</p>
          <p style="margin: 0;"><strong>Full Name:</strong> ${fullName}</p>
          <p style="margin: 0;"><strong>Registration Number:</strong> ${regNo}</p>
          <p style="margin: 0;"><strong>Student Email:</strong> ${email}</p>
          <p style="margin: 0;"><strong>Position Applied For:</strong> ${role}</p>
          <p style="margin: 0;"><strong>Previous Leadership Post:</strong> ${
            heldPositionBefore ? previousRole || "Yes (role not specified)" : "No"
          }</p>
        </div>

        <div style="background-color: #f0fdf4; border-left: 4px solid #059669; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 6px 0; font-weight: 800; color: #065f46; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em;">What Aspires You To Take This Role</p>
          <p style="margin: 0; font-size: 14px; color: #1f2937; white-space: pre-wrap;">${motivation}</p>
        </div>

        <div style="background-color: #f0fdf4; border-left: 4px solid #059669; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 6px 0; font-weight: 800; color: #065f46; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em;">What Is New That You Will Do For The Club</p>
          <p style="margin: 0; font-size: 14px; color: #1f2937; white-space: pre-wrap;">${newIdeas}</p>
        </div>

        <h3 style="color: #064e3b; font-size: 16px; margin: 26px 0 6px 0;">What To Expect Next</h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${timelineRows(config)}
        </table>
        <p style="font-size: 12px; color: #6b7280; margin-top: 14px;">
          ${config.venue ? `Venue: <strong>${config.venue}</strong>. ` : ""}
          ${config.notes || ""}
        </p>
        <p style="font-size: 12px; color: #6b7280;">
          Official voting is conducted physically on election day. The online impressions on the portal are for
          encouragement and do not replace the physical ballot.
        </p>

        <div style="margin: 26px 0 12px 0;">
          <a href="${BASE_URL}/dashboard/support" style="background-color: #064e3b; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-size: 13px; font-weight: bold; display: inline-block;">
            View Leadership Applicants
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
        to: email,
        subject: `Leadership Application Received - ${role} (${LEADERSHIP_SEASON})`,
        htmlContent: emailHtml,
      });
    } catch (emailError) {
      console.error("Warning: leadership application saved, but the email failed.", emailError);
    }

    try {
      await Notification.create({
        clerkId,
        title: "Leadership Application Received",
        message: `Congratulations! Your application for ${role} (${LEADERSHIP_SEASON}) has been received and is awaiting review.`,
        type: "leadership",
        link: "/dashboard/support",
      });
    } catch (notifError) {
      console.error("Failed to create leadership notification:", notifError);
    }

    return NextResponse.json(
      { message: "Leadership application submitted successfully", application, config },
      { status: 201 }
    );
  } catch (error) {
    console.error("Leadership POST Error:", error);
    return NextResponse.json({ error: "Failed to submit leadership application" }, { status: 500 });
  }
}
