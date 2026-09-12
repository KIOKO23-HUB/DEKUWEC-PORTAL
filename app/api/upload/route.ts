import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary securely using your .env variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    
    // FIX 1: Use getAll() to capture multiple files simultaneously
    const files = formData.getAll("file") as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // FIX 2: Process all selected files (photos and videos) in parallel
    const uploadPromises = files.map(async (file) => {
      // Convert the file into a buffer so Cloudinary can process it
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileBase64 = `data:${file.type};base64,${buffer.toString("base64")}`;

      // Upload to Cloudinary (auto-detects if it is a video or image)
      const result = await cloudinary.uploader.upload(fileBase64, {
        resource_type: "auto", // Crucial for video support
        folder: "dekuwec_portal",
      });

      return {
        url: result.secure_url,
        resource_type: result.resource_type // Returns 'image' or 'video'
      };
    });

    // Wait for all files to finish uploading
    const uploadedMedia = await Promise.all(uploadPromises);

    // Return the array of secure URLs back to the admin frontend
    return NextResponse.json({ 
      success: true,
      results: uploadedMedia // Array containing all URLs
    }, { status: 200 });

  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    return NextResponse.json({ error: "Media upload failed" }, { status: 500 });
  }
}
