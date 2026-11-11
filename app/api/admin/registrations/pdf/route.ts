import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import EventRegistration from "@/models/EventRegistration";
import { buildRegistrationPdf } from "@/lib/pdf";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const eventName = searchParams.get("eventName");

    if (!eventName) {
      return NextResponse.json({ error: "eventName is required." }, { status: 400 });
    }

    await connectToDatabase();
    const registrations = await EventRegistration.find({ eventName })
      .sort({ createdAt: 1 })
      .lean<Array<Record<string, any>>>();

    const pdf = buildRegistrationPdf(eventName, registrations);
    const safeName = eventName.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "event";

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="DEKUWEC-${safeName}-applicants.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Applicant PDF error:", error);
    return NextResponse.json({ error: "Failed to build the PDF." }, { status: 500 });
  }
}
