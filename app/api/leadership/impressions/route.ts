import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import LeadershipApplication from "@/models/LeadershipApplication";

export const dynamic = "force-dynamic";

// Members can leave one impression (support) per applicant. Official voting is physical.
export async function POST(req: Request) {
  try {
    const { applicationId, clerkId } = await req.json();

    if (!applicationId || !clerkId) {
      return NextResponse.json({ error: "Missing applicant or member id" }, { status: 400 });
    }

    await connectToDatabase();

    const application = await LeadershipApplication.findById(applicationId);
    if (!application || application.status !== "Approved") {
      return NextResponse.json({ error: "Applicant not available for impressions" }, { status: 404 });
    }

    const hasImpressed = application.impressedBy.includes(clerkId);

    if (hasImpressed) {
      application.impressedBy = application.impressedBy.filter((id: string) => id !== clerkId);
      application.impressions = Math.max(0, application.impressions - 1);
    } else {
      application.impressedBy.push(clerkId);
      application.impressions += 1;
    }

    await application.save();

    return NextResponse.json(
      {
        message: hasImpressed ? "Impression removed" : "Impression recorded",
        impressions: application.impressions,
        impressed: !hasImpressed,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Leadership Impression Error:", error);
    return NextResponse.json({ error: "Failed to record impression" }, { status: 500 });
  }
}
