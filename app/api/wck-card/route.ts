import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import WckApplication from "@/models/WckApplication";
import { sendEmail } from "@/lib/brevo";
import Notification from "@/models/Notification";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const clerkId = searchParams.get("clerkId");
    
    await connectToDatabase();
    if (clerkId) {
      const application = await WckApplication.findOne({ clerkId });
      return NextResponse.json({ application }, { status: 200 });
    }
    
    const applications = await WckApplication.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ applications }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { clerkId, fullName, email, phone, yearOfStudy, ageBracket, paymentStatus, amountPaid, mpesaReceipt } = body;

    if (!clerkId || !fullName || !phone) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    await connectToDatabase();

    const existingApp = await WckApplication.findOne({ clerkId });

    // Update or Create the application
    const application = await WckApplication.findOneAndUpdate(
      { clerkId },
      {
        clerkId,
        fullName,
        email,
        phone,
        yearOfStudy: yearOfStudy || "Year 1",
        ageBracket: ageBracket || "Below 23 years",
        paymentStatus: paymentStatus || "Not Yet Paid",
        amountPaid: amountPaid || 0,
        mpesaReceipt: mpesaReceipt || "",
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    // Only send the welcome email if this is a BRAND NEW application (not just a payment update)
    if (!existingApp && email) {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; color: #064e3b;">
          <h2 style="color: #059669;">WCK Card Application Received! 🎉</h2>
          <p>Hello ${fullName},</p>
          <p>Thank you for applying for the Wildlife Clubs of Kenya (WCK) student affiliate card. Your application has been successfully logged.</p>
          <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #a7f3d0;">
            <h3 style="margin-top: 0; color: #064e3b;">Next Steps: Payment</h3>
            <p>To complete your registration and activate your card, please complete the M-Pesa payment prompt on the portal.</p>
          </div>
          <p>Once payment is received, the club executive will verify your application and notify you when the card is ready for collection.</p>
          <br/>
          <p>Best regards,<br/><strong>DEKUWEC Executive Board</strong></p>
        </div>
      `;

      try {
        // FIXED: Brevo strictly requires the "to" field to be an array of objects
        await sendEmail({ 
          to: [{ email: email, name: fullName }], 
          subject: "Action Required: Complete your WCK Card Payment", 
          htmlContent: emailHtml 
        } as any);
      } catch (emailError) {
        console.error("Warning: Document saved, but email failed to send.", emailError);
      }

      if (clerkId) {
        await Notification.create({
          clerkId,
          title: "WCK Card Application Pending 💳",
          message: "Your application is under review. Please ensure your M-Pesa payment is completed.",
          type: "wck"
        });
      }
    }

    return NextResponse.json({ message: "Application processed successfully", application }, { status: 200 });
  } catch (error: any) {
    console.error("WCK Application Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process application" }, { status: 500 });
  }
}