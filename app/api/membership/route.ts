import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Member from "@/models/Member";
import { sendEmail } from "@/lib/brevo";
import Notification from "@/models/Notification";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { actionType, clerkId, fullName, email, phone, yearOfStudy, claimedRosterName } = body;

    await connectToDatabase();

    // Use findOneAndUpdate with upsert to prevent duplicate entries for the same user
    const memberData = await Member.findOneAndUpdate(
      { clerkId: clerkId },
      {
        clerkId,
        fullName,
        email,
        phone: phone || "",
        yearOfStudy: yearOfStudy || "",
        isOfficialRosterClaim: actionType === "claim",
        claimedRosterName: claimedRosterName || "",
        status: "Pending Approval"
      },
      { new: true, upsert: true }
    );

    let emailHtml = "";
    let emailSubject = "";
    let notificationTitle = "";
    let notificationMessage = "";

    if (actionType === "register") {
      emailSubject = "DEKUWEC Registration: Complete Your Payment";
      notificationTitle = "Membership Application Pending";
      notificationMessage = "Your registration application is under review. Please ensure you've sent the registration fee to 0118506251.";
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; color: #064e3b;">
          <h2 style="color: #059669;">Welcome to DEKUWEC! 🌿</h2>
          <p>Hello ${fullName},</p>
          <p>Thank you for applying to join the Dedan Kimathi Wildlife & Environmental Club. Your application is currently pending.</p>
          <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #a7f3d0;">
            <h3 style="margin-top: 0; color: #064e3b;">Registration Fee Payment</h3>
            <p>To finalize your registration and get approved, please send the registration fee via M-Pesa to:</p>
            <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #064e3b;">0118506251</p>
          </div>
          <p>Once payment is confirmed by the treasury, the admin will approve your status on the portal.</p>
          <br/>
          <p>Best regards,<br/><strong>DEKUWEC Executive Board</strong></p>
        </div>
      `;
    } else if (actionType === "claim") {
      emailSubject = "DEKUWEC: Roster Claim Received";
      notificationTitle = "Roster Claim Pending";
      notificationMessage = `Your claim for the roster name "${claimedRosterName}" is being reviewed by the admin.`;
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; color: #064e3b;">
          <h2 style="color: #059669;">Roster Verification Pending 🔍</h2>
          <p>Hello ${fullName},</p>
          <p>You have successfully submitted a claim for the roster name: <strong>${claimedRosterName}</strong>.</p>
          <p>Our admin team is currently reviewing your claim against our official records. You will notice your directory status says "Pending Approval" until this verification is complete.</p>
          <br/>
          <p>Best regards,<br/><strong>DEKUWEC Executive Board</strong></p>
        </div>
      `;
    }

    try {
      await sendEmail({
        to: email,
        subject: emailSubject,
        htmlContent: emailHtml,
      });
      console.log("Membership email dispatched successfully to", email);
    } catch (emailError) {
      console.error("Warning: Member saved, but email failed.", emailError);
    }

    // Create In-App Notification
    await Notification.create({
      clerkId,
      title: notificationTitle,
      message: notificationMessage,
      type: "membership"
    });

    return NextResponse.json(
      { message: "Submission successful", data: memberData },
      { status: 200 }
    );

  } catch (error) {
    console.error("Membership API Error:", error);
    return NextResponse.json(
      { error: "Failed to process membership request" },
      { status: 500 }
    );
  }
}
