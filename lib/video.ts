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
