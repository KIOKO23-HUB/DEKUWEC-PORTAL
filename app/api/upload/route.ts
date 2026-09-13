import { NextResponse } from "next/server";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// GET: Generates a secure signature for frontend direct uploads
export async function GET() {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = "dekuwec_portal";

    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      process.env.CLOUDINARY_API_SECRET!
    );

    return NextResponse.json(
      {
        timestamp,
        signature,
        folder,
        apiKey: process.env.CLOUDINARY_API_KEY,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Signature Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate signature" },
      { status: 500 }
    );
  }
}

// POST: Handles standard server-side uploads via streams (prevents payload crashes)
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("file") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const uploadPromises = files.map(async (file) => {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      return new Promise<{ url: string; resource_type: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: "auto",
            folder: "dekuwec_portal",
          },
          (error, result?: UploadApiResponse) => {
            if (error || !result) {
              return reject(error || new Error("Cloudinary upload failed"));
            }
            resolve({
              url: result.secure_url,
              resource_type: result.resource_type,
            });
          }
        );

        stream.end(buffer);
      });
    });

    const uploadedMedia = await Promise.all(uploadPromises);

    return NextResponse.json(
      { success: true, results: uploadedMedia },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Cloudinary Upload Error:", error);
    return NextResponse.json(
      { error: error?.message || "Media upload failed" },
      { status: 500 }
    );
  }
}
