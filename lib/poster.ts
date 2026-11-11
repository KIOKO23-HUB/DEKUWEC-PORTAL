export type PosterTemplate = {
  imageUrl: string;
  photo: { x: number; y: number; width: number; height: number };
  name: { x: number; y: number; size: number; color: string; align: "left" | "center" | "right" };
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

async function loadRemoteImage(url: string): Promise<HTMLImageElement> {
  // Fetching to a blob keeps the canvas untainted even if the CDN redirects.
  try {
    const res = await fetch(url, { mode: "cors", cache: "no-store" });
    if (!res.ok) throw new Error(`Image request failed (${res.status})`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      return await loadImage(objectUrl);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    // Fall back to a same-origin proxy so canvas exports never taint.
    try {
      const res = await fetch(`/api/public/poster-image?url=${encodeURIComponent(url)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Proxy request failed (${res.status})`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      try {
        return await loadImage(objectUrl);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    } catch {
      return loadImage(url);
    }
  }
}

async function loadLocalImage(file: Blob): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(file);
  try {
    return await loadImage(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Draws the applicant photo + name onto the admin-authored poster template. */
export async function renderPoster(
  template: PosterTemplate,
  photo: Blob,
  name: string,
  maxWidth = 2000
): Promise<{ blob: Blob; dataUrl: string }> {
  const [templateImg, photoImg] = await Promise.all([
    loadRemoteImage(template.imageUrl),
    loadLocalImage(photo),
  ]);

  const scale = Math.min(1, maxWidth / (templateImg.naturalWidth || maxWidth));
  const width = Math.max(1, Math.round(templateImg.naturalWidth * scale));
  const height = Math.max(1, Math.round(templateImg.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser");

  ctx.drawImage(templateImg, 0, 0, width, height);

  const photoBox = template.photo;
  const px = (photoBox.x / 100) * width;
  const py = (photoBox.y / 100) * height;
  const pw = (photoBox.width / 100) * width;
  const ph = (photoBox.height / 100) * height;

  if (pw > 1 && ph > 1) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(px, py, pw, ph);
    ctx.clip();
    const cover = Math.max(pw / photoImg.naturalWidth, ph / photoImg.naturalHeight);
    const drawW = photoImg.naturalWidth * cover;
    const drawH = photoImg.naturalHeight * cover;
    ctx.drawImage(photoImg, px + (pw - drawW) / 2, py + (ph - drawH) / 2, drawW, drawH);
    ctx.restore();
  }

  const nameBox = template.name;
  const fontSize = Math.max(8, (nameBox.size / 100) * width);
  ctx.font = `bold ${fontSize}px Arial, Helvetica, sans-serif`;
  ctx.fillStyle = nameBox.color || "#ffffff";
  ctx.textAlign = nameBox.align || "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name.trim(), (nameBox.x / 100) * width, (nameBox.y / 100) * height);

  const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) throw new Error("Could not export the poster");

  return { blob, dataUrl };
}
