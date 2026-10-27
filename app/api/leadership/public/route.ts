import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import LeadershipApplication, {
  LEADERSHIP_REQUIREMENTS,
  LEADERSHIP_ROLES,
} from "@/models/LeadershipApplication";
import LeadershipConfig, { LEADERSHIP_SEASON } from "@/models/LeadershipConfig";
import Member from "@/models/Member";
import { sendEmail } from "@/lib/brevo";

export const dynamic = "force-dynamic";

const CLUB_EMAIL = "wildlifeandenvironmentalclub@dkut.ac.ke";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://dekuwec.app";

async function getConfig() {
  const existing = await LeadershipConfig.findOne({ season: LEADERSHIP_SEASON });
  if (existing) return existing;
  return LeadershipConfig.create({ season: LEADERSHIP_SEASON });
}

function esc(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function timelineRows(config: any) {
  return [
    { title: "Debate &amp; Interrogation", date: config?.debateDate },
    { title: "Campaigns &amp; Petitions", date: config?.campaignDate },
    { title: "Election Day (Physical Voting)", date: config?.electionDate },
  ]
    .map(
      (row) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #111827;">
            <strong>${row.title}</strong>
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-align: right; font-weight: bold; color: ${row.date ? "#065f46" : "#b45309"};">
            ${esc(row.date) || "Date to be announced"}
          </td>
        </tr>`
    )
    .join("");
}

export async function GET() {
  try {
    await connectToDatabase();
    const config = await getConfig();

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
      createdAt: app.createdAt,
    }));

    const totalApplications = await LeadershipApplication.countDocuments({});

    return NextResponse.json(
      {
        applicants,
        totalApplications,
        config,
        season: LEADERSHIP_SEASON,
        roles: LEADERSHIP_ROLES,
        requirements: LEADERSHIP_REQUIREMENTS,
        applicationsOpen: config.applicationsOpen,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Public leadership GET Error:", error);
    return NextResponse.json({ error: "Failed to load leadership data" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
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

    const studentEmail = String(email || "").trim().toLowerCase();

    if (!fullName || !regNo || !studentEmail || !role || !motivation || !newIdeas) {
      return NextResponse.json(
        { error: "Name, registration number, student email, position and your responses are required." },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail)) {
      return NextResponse.json({ error: "Please enter a valid student email address." }, { status: 400 });
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
    const config = await getConfig();

    if (!config.applicationsOpen) {
      return NextResponse.json(
        { error: "Leadership applications for this season are currently closed." },
        { status: 403 }
      );
    }

    const memberDoc = await Member.findOne({
      email: new RegExp(`^${studentEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    });
    const isRegisteredMember =
      !!memberDoc && ["Registered Member", "Approved"].includes(memberDoc.status || "");

    // Public applicants have no account, so a stable anonymous id is derived from their email
    const clerkId = `public_${crypto.createHash("sha256").update(studentEmail).digest("hex").slice(0, 24)}`;

    const existing = await LeadershipApplication.findOne({
      $or: [{ clerkId }, { email: studentEmail }],
    });
    if (existing && existing.status !== "Rejected") {
      return NextResponse.json(
        {
          error:
            existing.status === "Approved"
              ? "An application with this email has already been approved."
              : "An application with this email is already awaiting review.",
        },
        { status: 409 }
      );
    }

    const payload = {
      clerkId,
      fullName: String(fullName).trim(),
      regNo: String(regNo).trim(),
      email: studentEmail,
      role,
      motivation: String(motivation).trim(),
      newIdeas: String(newIdeas).trim(),
      heldPositionBefore: !!heldPositionBefore,
      previousRole: heldPositionBefore ? String(previousRole || "").trim() : "",
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

    const receiptHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; color: #111827;">
        <h2 style="color: #064e3b; margin: 0 0 4px 0; font-size: 22px; font-weight: 800;">Congratulations, ${esc(payload.fullName)}!</h2>
        <p style="font-size: 13px; font-weight: bold; color: #059669; margin: 0 0 18px 0;">DEKUWEC Leadership Application ${LEADERSHIP_SEASON}</p>
        <p style="font-size: 14px; line-height: 1.6; color: #374151;">
          Your application to serve as <strong>${esc(role)}</strong> in the Dedan Kimathi Wildlife &amp; Environmental Club
          executive board has been received successfully. A decision will be sent to this email address.
        </p>
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 14px; line-height: 1.7;">
          <p style="margin: 0 0 8px 0; font-weight: 800; color: #064e3b; text-transform: uppercase; font-size: 11px; letter-spacing: 0.06em;">Your Submitted Responses</p>
          <p style="margin: 0;"><strong>Full Name:</strong> ${esc(payload.fullName)}</p>
          <p style="margin: 0;"><strong>Registration Number:</strong> ${esc(payload.regNo)}</p>
          <p style="margin: 0;"><strong>Student Email:</strong> ${esc(studentEmail)}</p>
          <p style="margin: 0;"><strong>Position:</strong> ${esc(role)}</p>
          <p style="margin: 0;"><strong>Previous Leadership Post:</strong> ${payload.heldPositionBefore ? esc(payload.previousRole || "Yes (role not specified)") : "No"}</p>
        </div>
        <div style="background-color: #f0fdf4; border-left: 4px solid #059669; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 6px 0; font-weight: 800; color: #065f46; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em;">What Aspires You To Take This Role</p>
          <p style="margin: 0; font-size: 14px; color: #1f2937; white-space: pre-wrap;">${esc(payload.motivation)}</p>
        </div>
        <div style="background-color: #f0fdf4; border-left: 4px solid #059669; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 6px 0; font-weight: 800; color: #065f46; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em;">What Is New That You Will Do For The Club</p>
          <p style="margin: 0; font-size: 14px; color: #1f2937; white-space: pre-wrap;">${esc(payload.newIdeas)}</p>
        </div>
        <h3 style="color: #064e3b; font-size: 16px; margin: 24px 0 6px 0;">Election Timeline</h3>
        <table style="width: 100%; border-collapse: collapse;">${timelineRows(config)}</table>
        <p style="font-size: 12px; color: #6b7280; margin-top: 14px;">
          ${config.venue ? `Venue: <strong>${esc(config.venue)}</strong>. ` : ""}${esc(config.notes)}
        </p>
        <p style="font-size: 12px; color: #6b7280;">Official voting is physical on election day.</p>
        <div style="margin: 24px 0 12px 0;">
          <a href="${BASE_URL}/leadership" style="background-color: #064e3b; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-size: 13px; font-weight: bold; display: inline-block;">
            View Leadership Page
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 12px; color: #6b7280; margin: 0;">
          Dedan Kimathi Wildlife &amp; Environmental Club<br/>
          Dedan Kimathi University of Technology, Nyeri, Kenya
        </p>
      </div>
    `;

    const clubHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #111827;">
        <h2 style="color: #064e3b; margin: 0 0 4px 0; font-size: 20px; font-weight: 800;">New Leadership Application</h2>
        <p style="font-size: 13px; color: #6b7280; margin: 0 0 18px 0;">${LEADERSHIP_SEASON} season &middot; submitted via the public link</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; line-height: 1.8;">
          <tr><td style="color:#6b7280;">Position</td><td style="font-weight:bold;">${esc(role)}</td></tr>
          <tr><td style="color:#6b7280;">Name</td><td>${esc(payload.fullName)}</td></tr>
          <tr><td style="color:#6b7280;">Reg. No.</td><td>${esc(payload.regNo)}</td></tr>
          <tr><td style="color:#6b7280;">Student Email</td><td>${esc(studentEmail)}</td></tr>
          <tr><td style="color:#6b7280;">Member Status</td><td>${esc(payload.memberStatus)}</td></tr>
          <tr><td style="color:#6b7280;">Previous Post</td><td>${payload.heldPositionBefore ? esc(payload.previousRole || "Yes") : "No"}</td></tr>
        </table>
        <div style="background:#f9fafb;border-radius:12px;padding:16px;margin:18px 0;">
          <p style="margin:0 0 6px 0;font-size:11px;font-weight:800;text-transform:uppercase;color:#065f46;">Motivation</p>
          <p style="margin:0;font-size:14px;white-space:pre-wrap;">${esc(payload.motivation)}</p>
        </div>
        <div style="background:#f9fafb;border-radius:12px;padding:16px;margin:18px 0;">
          <p style="margin:0 0 6px 0;font-size:11px;font-weight:800;text-transform:uppercase;color:#065f46;">New Ideas</p>
          <p style="margin:0;font-size:14px;white-space:pre-wrap;">${esc(payload.newIdeas)}</p>
        </div>
        <a href="${BASE_URL}/admin" style="background-color:#064e3b;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:13px;font-weight:bold;display:inline-block;">
          Review In Admin Panel
        </a>
      </div>
    `;

    const results = await Promise.allSettled([
      sendEmail({
        to: studentEmail,
        subject: `Leadership Application Received - ${role} (${LEADERSHIP_SEASON})`,
        htmlContent: receiptHtml,
      }),
      sendEmail({
        to: CLUB_EMAIL,
        subject: `New Leadership Application - ${role} (${payload.fullName})`,
        htmlContent: clubHtml,
      }),
    ]);
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(
          `Warning: leadership email ${index === 0 ? "receipt" : "club notice"} failed.`,
          result.reason
        );
      }
    });

    return NextResponse.json(
      {
        message: "Application submitted successfully. A confirmation email has been sent.",
        application: { fullName: application.fullName, role: application.role, status: application.status },
        config,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Public leadership POST Error:", error);
    return NextResponse.json({ error: "Failed to submit leadership application" }, { status: 500 });
  }
}
