import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import CommunitySnap from "@/models/CommunitySnap";
import Notification from "@/models/Notification";
import { notifyAllMembers } from "@/lib/notify";
import { activeSnapFilter, storyExpiry } from "@/lib/snaps";
import { getJamendoTrack, JamendoError, type JamendoTrack } from "@/lib/jamendo";
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
    const snaps = await CommunitySnap.find(activeSnapFilter())
      .select(
        "imageUrl videoUrl mediaType musicTrackId musicTitle musicArtist musicAudioUrl musicTrackUrl musicLicenseUrl kind expiresAt eventId eventTitle caption fullName userProfilePic clerkId likes dislikes reposts comments createdAt"
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
    const {
      clerkId,
      fullName,
      userProfilePic,
      imageUrl,
      videoUrl,
      mediaType,
      caption,
      musicTrackId,
      kind,
      eventId,
      eventTitle,
    } = await req.json();
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

    let musicTrack: JamendoTrack | null = null;
    if (musicTrackId) {
      if (!isVideo) {
        return NextResponse.json({ error: "Music can only be added to video snaps." }, { status: 400 });
      }
      try {
        musicTrack = await getJamendoTrack(String(musicTrackId));
      } catch (error) {
        if (error instanceof JamendoError) {
          return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("Could not verify the selected music track:", error);
        return NextResponse.json({ error: "The selected music track could not be verified." }, { status: 502 });
      }
      if (!musicTrack) {
        return NextResponse.json(
          { error: "That track is unavailable or does not allow remixing under the supported license." },
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
      musicTrackId: musicTrack?.id || "",
      musicTitle: musicTrack?.title || "",
      musicArtist: musicTrack?.artist || "",
      musicAudioUrl: musicTrack?.audioUrl || "",
      musicTrackUrl: musicTrack?.trackUrl || "",
      musicLicenseUrl: musicTrack?.licenseUrl || "",
      kind: kind === "story" ? "story" : "reel",
      expiresAt: storyExpiry(kind),
      eventId: typeof eventId === "string" ? eventId.slice(0, 40) : "",
      eventTitle: typeof eventTitle === "string" ? eventTitle.slice(0, 120) : "",
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
