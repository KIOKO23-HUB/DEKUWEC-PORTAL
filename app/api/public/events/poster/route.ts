import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import EventRegistration from "@/models/EventRegistration";

export const dynamic = "force-dynamic";

function isHttpUrl(value: unknown) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

/** Stores the applicant's passport photo and the personalised poster they generated. */
export async function POST(req: Request) {
  try {
    const { registrationId, clerkId, posterPhotoUrl, posterImageUrl } = await req.json();

    if (!registrationId || !clerkId || !isHttpUrl(posterPhotoUrl) || !isHttpUrl(posterImageUrl)) {
      return NextResponse.json({ error: "Registration and poster URLs are required." }, { status: 400 });
    }

    if (!mongoose.isValidObjectId(registrationId)) {
      return NextResponse.json({ error: "Invalid registration." }, { status: 400 });
    }

    await connectToDatabase();
    const registration = await EventRegistration.findOneAndUpdate(
      { _id: registrationId, clerkId },
      { posterPhotoUrl, posterImageUrl, posterUploadedAt: new Date() },
      { new: true }
    );

    if (!registration) {
      return NextResponse.json({ error: "Registration not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Poster upload error:", error);
    return NextResponse.json({ error: "Could not save the poster." }, { status: 500 });
  }
}
