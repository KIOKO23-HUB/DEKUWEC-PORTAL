export const MAX_SNAP_VIDEO_SECONDS = 12;

export function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/") || /\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(file.name);
}

export async function readVideoDuration(file: File): Promise<number> {
  const video = document.createElement("video");
  const objectUrl = URL.createObjectURL(file);

  return new Promise<number>((resolve, reject) => {
    let settled = false;
    const timeout = window.setTimeout(() => finish(new Error("Timed out while reading this video.")), 8000);

    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(objectUrl);
    };

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      const duration = video.duration;
      cleanup();
      if (error) reject(error);
      else if (Number.isFinite(duration) && duration > 0) resolve(duration);
      else reject(new Error("This video's duration could not be read. Try an MP4 or WebM clip."));
    };

    video.preload = "metadata";
    video.onloadedmetadata = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        finish();
      } else {
        try {
          video.currentTime = 1e10;
        } catch {
          finish();
        }
      }
    };
    video.ondurationchange = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) finish();
    };
    video.onseeked = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) finish();
    };
    video.onerror = () => finish(new Error("This video could not be read. Try an MP4 or WebM clip."));
    video.src = objectUrl;
  });
}

/**
 * Returns a Cloudinary first-frame thumbnail for a video URL.
 *
 * Cards and story bubbles use this instead of mounting a <video> element, so a
 * feed of clips does not download every video before someone taps one.
 */
export function videoPoster(url?: string | null, width = 700): string {
  if (!url) return "";
  if (!url.includes("res.cloudinary.com") || !url.includes("/video/upload/")) return "";

  const [base, rest] = url.split("/video/upload/");
  if (!base || !rest) return "";
  if (/so_\d|f_jpg/.test(rest.split("/")[0] || "")) return url;

  return `${base}/video/upload/so_0,w_${width},c_fill,q_auto,f_jpg/${rest}`;
}
