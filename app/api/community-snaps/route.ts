import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import CommunitySnap from "@/models/CommunitySnap";
import Notification from "@/models/Notification";
import { notifyAllMembers } from "@/lib/notify";
import {
  MAX_NATURE_VIDEO_SECONDS,
  deleteVideo,
  getVideoInfo,
  isFreshUpload,
  isNatureVideoWithinLimit,
} from "@/lib/cloudinaryVideo";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectToDatabase();
    const snaps = await CommunitySnap.find({})
      .select(
        "imageUrl videoUrl mediaType caption fullName userProfilePic clerkId likes dislikes reposts comments createdAt"
      )
      .sort({ createdAt: -1 })
      .limit(80)
      .lean();
    return NextResponse.json({ snaps }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch community snaps" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { clerkId, fullName, userProfilePic, imageUrl, videoUrl, mediaType, caption } = await req.json();
    await connectToDatabase();

    if (!imageUrl && !videoUrl) {
      return NextResponse.json({ error: "Add an image or a short video." }, { status: 400 });
    }

    const isVideo = mediaType === "video" || !!videoUrl;

    // Verify the real duration with Cloudinary metadata. The browser check can
    // be bypassed, so an over-long clip is deleted and rejected here.
    if (isVideo && videoUrl) {
      try {
        const info = await getVideoInfo(videoUrl);
        const duration = info?.duration ?? null;

        if (!isNatureVideoWithinLimit(duration)) {
          // Clean up only this upload. A reused or older URL is never deleted.
          if (info && isFreshUpload(info.createdAt)) {
            const alreadyPublished = await CommunitySnap.exists({ videoUrl });
            if (!alreadyPublished) await deleteVideo(videoUrl);
          }
          return NextResponse.json(
            {
              error:
                duration === null
                  ? "That clip could not be verified. Please upload an MP4 or WebM video."
                  : `Nature clips must be ${MAX_NATURE_VIDEO_SECONDS} seconds or less. Yours was ${Math.ceil(
                      duration
                    )} seconds.`,
            },
            { status: 400 }
          );
        }
      } catch (durationError) {
        console.error("Could not verify video duration:", durationError);
        return NextResponse.json(
          { error: "We could not check that video's length. Please try uploading it again." },
          { status: 400 }
        );
      }
    }
    
    const newSnap = new CommunitySnap({
      clerkId,
      fullName,
      userProfilePic,
      imageUrl: isVideo ? "" : imageUrl || "",
      videoUrl: isVideo ? videoUrl : "",
      mediaType: isVideo ? "video" : "image",
      caption: String(caption || "").slice(0, 240),
    });
    await newSnap.save();

    const snapLink = `/nature-snaps?snap=${newSnap._id}`;

    // Thank-you notification for the photographer.
    if (clerkId) {
      try {
        await Notification.create({
          clerkId,
          title: "Thanks for posting! 🌿",
          message: `Your nature snap${caption ? ` "${caption}"` : ""} is live and entered for this week's Hall of Fame.`,
          type: "snap",
          link: snapLink,
          imageUrl,
        });
      } catch (notifyError) {
        console.warn("Snap thank-you notification skipped:", notifyError);
      }
    }

    // Alert every other member by in-app notification and email.
    try {
      await notifyAllMembers({
        title: `${fullName || "A member"} posted a new nature snap!`,
        message: `${fullName || "A DEKUWEC member"} just shared a new photo${caption ? `: "${caption}"` : ""}. Tap to view the full snap.`,
        link: snapLink,
        imageUrl,
        excludeClerkIds: [clerkId],
      });
    } catch (notifyError) {
      console.warn("Snap broadcast skipped:", notifyError);
    }

    return NextResponse.json({ message: "Snap uploaded successfully", snap: newSnap }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to upload snap" }, { status: 500 });
  }
}

// NEW: Allows users to securely delete their own uploads
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const clerkId = searchParams.get("clerkId"); 

    if (!id || !clerkId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    await connectToDatabase();

    // The query specifically matches BOTH the snap ID and the original uploader's Clerk ID.
    // If someone else tries to delete it, the query will safely fail and return null.
    const deletedSnap = await CommunitySnap.findOneAndDelete({ _id: id, clerkId: clerkId });

    if (!deletedSnap) {
      return NextResponse.json({ error: "Unauthorized or snap not found" }, { status: 403 });
    }

    return NextResponse.json({ message: "Snap deleted successfully" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete snap" }, { status: 500 });
  }
}
