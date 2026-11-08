/**
 * Rewrites Cloudinary delivery URLs so browsers only download an
 * appropriately sized, modern-format image instead of the full original.
 */
export function optimizedImage(url?: string | null, width = 800): string {
  if (!url) return "";
  if (!url.startsWith("http")) return url;
  if (!url.includes("res.cloudinary.com") || !url.includes("/image/upload/")) return url;

  const [base, rest] = url.split("/image/upload/");
  if (!base || !rest) return url;

  const firstSegment = rest.split("/")[0] || "";
  const alreadyOptimized = /(?:^|,)(?:f_auto|q_auto|w_\d+|c_limit)/.test(firstSegment);
  if (alreadyOptimized) return url;

  return `${base}/image/upload/f_auto,q_auto,w_${width},c_limit/${rest}`;
}
