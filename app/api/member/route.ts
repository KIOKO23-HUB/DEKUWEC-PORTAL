import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import mongoose from "mongoose";
import { sendEmail } from "@/lib/brevo";
import Notification from "@/models/Notification";

// Define Mongoose Schema & Model
const MemberSchema = new mongoose.Schema({
  clerkId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  displayName: { type: String, default: "" },
  course: { type: String, default: "" },
  year: { type: String, default: "Year 1" },
  photoURL: { type: String, default: "" },
  status: { type: String, enum: ["Unregistered", "Pending", "Approved", "Rejected"], default: "Unregistered" },
  updatedAt: { type: Date, default: Date.now },
});

const Member = mongoose.models.Member || mongoose.model("Member", MemberSchema);

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const email = user?.emailAddresses[0]?.emailAddress || "";
    const firstName = user?.firstName || "Nature Enthusiast";

    await connectToDatabase();

    let member = await Member.findOne({ clerkId: userId });
    
    // IF THIS IS A BRAND NEW USER, CREATE THEM AND SEND THE WELCOME EMAIL
    if (!member) {
      member = await Member.create({
        clerkId: userId,
        email,
        displayName: user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "",
        photoURL: user?.imageUrl || "",
      });

      // Draft the highly detailed Welcome Email
      const welcomeEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; color: #064e3b; line-height: 1.6;">
          <h1 style="color: #059669; text-align: center;">Welcome to DEKUWEC! 🌿</h1>
          <p style="font-size: 16px;">Hello ${firstName},</p>
          <p style="font-size: 16px;">Congratulations on successfully joining the Dedan Kimathi Wildlife and Environmental Club (DEKUWEC) portal! Your account is now active, and your green journey starts here.</p>
          
          <div style="background-color: #ecfdf5; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #a7f3d0;">
            <h3 style="margin-top: 0; color: #064e3b; border-bottom: 2px solid #34d399; padding-bottom: 5px;">What You Can Do in the Portal</h3>
            <ul style="padding-left: 20px; color: #065f46;">
              <li style="margin-bottom: 8px;"><strong>Events & Activities:</strong> RSVP for upcoming hikes, game drives, and tree-planting excursions directly from your dashboard.</li>
              <li style="margin-bottom: 8px;"><strong>Membership & WCK Card:</strong> Apply for your official Wildlife Clubs of Kenya (WCK) card to access national parks and club perks.</li>
              <li style="margin-bottom: 8px;"><strong>EcoPulse Dispatch:</strong> Read our exclusive club articles and updates on wildlife conservation.</li>
              <li style="margin-bottom: 8px;"><strong>Direct Messaging:</strong> Use the Chat feature to message the Executive Board and connect with fellow club members.</li>
            </ul>
          </div>

          <div style="background-color: #f0fdf4; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #bbf7d0;">
            <h3 style="margin-top: 0; color: #064e3b; border-bottom: 2px solid #4ade80; padding-bottom: 5px;">Our Club Activities</h3>
            <p style="font-size: 14px; color: #166534; margin-bottom: 10px;">As a member, you are invited to join our regular physical meetings <strong>every Wednesday from 5:00 PM – 6:45 PM</strong> at the School of Business (Room 5).</p>
            <ul style="padding-left: 20px; color: #166534; font-size: 14px;">
              <li>Campus tree nursery establishment and clean-up drives.</li>
              <li>Fun days featuring colorfests, board games, and outdoor team building.</li>
              <li>Wildlife debates, trivia, and nature photography (Nature Snaps).</li>
              <li>Community outreach, including children's home visits and conservation education.</li>
            </ul>
          </div>

          <p style="font-size: 16px;">We recommend heading over to the <strong>Membership Portal</strong> tab to officially verify your registration status and complete any pending club fee payments.</p>
          <p style="font-size: 16px;">We are thrilled to have you with us. Let's make an impact together!</p>
          <br/>
          <p style="font-size: 16px;">Best regards,<br/><strong>The DEKUWEC Executive Board</strong></p>
        </div>
      `;

      // Dispatch the email via Brevo
      try {
        await sendEmail({
          to: email,
          subject: "Welcome to DEKUWEC! 🌿 Your Green Journey Starts Here",
          htmlContent: welcomeEmailHtml,
        });
        console.log(`Welcome email successfully sent to new user: ${email}`);
      } catch (emailError) {
        console.error("Warning: Member created, but welcome email failed to send.", emailError);
      }

      // 5. Create In-App Notification
      await Notification.create({
        clerkId: userId,
        title: "Welcome to DEKUWEC! 🌿",
        message: "Your account is ready. Check your student email for the full club guide!",
        type: "general"
      });
    }

    return NextResponse.json({ member });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { displayName, course, year, status } = body;

    const user = await currentUser();
    const email = user?.emailAddresses[0]?.emailAddress || "";

    await connectToDatabase();

    const updateData: any = {
      email,
      updatedAt: new Date(),
    };

    if (displayName !== undefined) updateData.displayName = displayName;
    if (course !== undefined) updateData.course = course;
    if (year !== undefined) updateData.year = year;
    if (status !== undefined) updateData.status = status;

    const member = await Member.findOneAndUpdate(
      { clerkId: userId },
      { $set: updateData },
      { new: true, upsert: true }
    );

    return NextResponse.json({ member });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
