"use client";

const MAX_UPLOAD_BYTES = 2_500_000;

/**
 * Shrinks phone photos in the browser before they leave the device. This keeps
 * uploads under serverless request limits and makes every later page load faster.
 */
export async function compressImage(
  file: File,
  maxDimension = 1800,
  quality = 0.82
): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") {
    return file;
  }
  if (file.size <= 900_000) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    let attemptQuality = quality;
    let blob: Blob | null = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", attemptQuality)
      );
      if (!blob || blob.size <= MAX_UPLOAD_BYTES) break;
      attemptQuality -= 0.12;
    }

    if (!blob) return file;
    const name = (file.name || "photo").replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${name}.jpg`, { type: "image/jpeg" });
  } catch (error) {
    console.warn("Image compression skipped:", error);
    return file;
  }
}

async function directUpload(file: File): Promise<string> {
  const signRes = await fetch("/api/upload", { method: "GET", cache: "no-store" });
  if (!signRes.ok) throw new Error("Could not authorise the upload.");
  const sign = await signRes.json();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", sign.apiKey);
  formData.append("timestamp", String(sign.timestamp));
  formData.append("signature", sign.signature);
  formData.append("folder", sign.folder || "dekuwec_portal");

  const res = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/auto/upload`, {
    method: "POST",
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.secure_url) {
    throw new Error(data?.error?.message || "Cloudinary rejected the upload.");
  }
  return data.secure_url as string;
}

async function serverUpload(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  const data = await res.json().catch(() => ({}));
  const url = data.results?.[0]?.url || data.secure_url || data.url;
  if (!res.ok || !url) throw new Error(data.error || "Upload failed. Try a smaller photo.");
  return url as string;
}

/**
 * Compresses, then uploads straight to Cloudinary so the file never has to pass
 * through the app server (which caps request bodies on most hosts).
 */
export async function uploadImage(file: File): Promise<string> {
  const optimized = await compressImage(file);
  try {
    return await directUpload(optimized);
  } catch (directError) {
    console.warn("Direct upload failed, retrying through the server:", directError);
    return serverUpload(optimized);
  }
}
