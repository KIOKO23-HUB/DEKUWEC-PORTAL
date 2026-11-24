import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/** Nature clips are hard-capped here; the browser check is only a convenience. */
export const MAX_NATURE_VIDEO_SECONDS = 12;

/**
 * Extracts the Cloudinary public id from a delivery URL, skipping the version
 * and any transformation segment that may already be present.
 */
export function videoPublicId(url?: string | null): string | null {
  if (!url || !url.includes("/video/upload/")) return null;
  const path = url.split("?")[0].split("/video/upload/")[1];
  if (!path) return null;

  const kept = path
    .split("/")
    .filter(Boolean)
    .filter((segment, index) => {
      if (/^v\d+$/.test(segment)) return false;
      if (index === 0 && /[,_]/.test(segment)) return false;
      return true;
    })
    .join("/");

  return kept ? kept.replace(/\.[a-z0-9]+$/i, "") : null;
}

export type VideoInfo = {
  duration: number | null;
  createdAt: Date | null;
};

/**
 * Reads the real duration from Cloudinary's own metadata, so a client cannot
 * bypass the 12-second limit by editing the upload request.
 */
export async function getVideoInfo(url: string): Promise<VideoInfo | null> {
  const publicId = videoPublicId(url);
  if (!publicId) return null;

  // Cloudinary only includes `duration` for videos when media metadata is
  // requested; without this flag the response has no timing information.
  const resource = await cloudinary.api.resource(publicId, {
    resource_type: "video",
    media_metadata: true,
  });
  const payload = resource as {
    duration?: number;
    created_at?: string;
    media_metadata?: { duration?: number };
  };
  const duration = Number(payload?.duration ?? payload?.media_metadata?.duration);

  return {
    duration: Number.isFinite(duration) && duration > 0 ? duration : null,
    createdAt: payload?.created_at ? new Date(payload.created_at) : null,
  };
}

/**
 * Only a just-uploaded asset is safe to clean up. Without this guard a request
 * quoting someone else's older video URL could delete their media.
 */
export function isFreshUpload(createdAt: Date | null, minutes = 30): boolean {
  if (!createdAt) return false;
  return Date.now() - createdAt.getTime() <= minutes * 60_000;
}

/**
 * Single source of truth for the clip limit. A small tolerance absorbs the
 * rounding Cloudinary applies to durations (12.04s reads back as 12).
 */
export function isNatureVideoWithinLimit(duration: number | null): boolean {
  if (duration === null || !Number.isFinite(duration)) return false;
  return duration <= MAX_NATURE_VIDEO_SECONDS + 0.25;
}

export async function deleteVideo(url: string): Promise<void> {
  const publicId = videoPublicId(url);
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: "video", invalidate: true });
}
