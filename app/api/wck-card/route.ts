import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import WckApplication from "@/models/WckApplication";
import { sendEmail } from "@/lib/brevo";
import Notification from "@/models/Notification";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Added clerkId so we know who to send the notification to!
    const { clerkId, fullName, email, phone, yearOfStudy, ageBracket } = body;

    // 1. Connect to Database
    await connectToDatabase();

    // 2. Construct and Save Application to MongoDB safely
    const newApplication = new WckApplication({
      clerkId, // Saving this here as well if your schema supports it
      fullName,
      email,
      phone,
      yearOfStudy,
      ageBracket,
    });
    
    await newApplication.save();

    // 3. Draft HTML Email content
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; color: #064e3b;">
        <h2 style="color: #059669;">WCK Card Application Received! 🎉</h2>
        <p>Hello ${fullName},</p>
        <p>Thank you for applying for the Wildlife Clubs of Kenya (WCK) student affiliate card. Your application has been successfully logged.</p>
        <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #a7f3d0;">
          <h3 style="margin-top: 0; color: #064e3b;">Next Steps: Payment</h3>
          <p>To complete your registration and activate your card, please send the membership fee via M-Pesa to:</p>
          <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #064e3b;">0118506251</p>
        </div>
        <p>Once payment is received, the club executive will verify your application and notify you when the card is ready for collection.</p>
        <br/>
        <p>Best regards,<br/><strong>DEKUWEC Executive Board</strong></p>
      </div>
    `;

    // 4. Send Email via Brevo
    try {
      await sendEmail({
        to: email,
        subject: "Action Required: Complete your WCK Card Payment",
        htmlContent: emailHtml,
      });
      console.log("Email dispatched successfully to", email);
    } catch (emailError) {
      console.error("Warning: Document saved, but email failed to send.", emailError);
    }

    // 5. Create In-App Notification
    if (clerkId) {
      await Notification.create({
        clerkId,
        title: "WCK Card Application Pending 💳",
        message: "Your application is under review. Please ensure you've sent the fee to 0118506251.",
        type: "wck"
      });
    }

    return NextResponse.json(
      { message: "Application submitted successfully", application: newApplication },
      { status: 201 }
    );

  } catch (error) {
    console.error("WCK Application Error:", error);
    return NextResponse.json(
      { error: "Failed to process application" },
      { status: 500 }
    );
  }
}
