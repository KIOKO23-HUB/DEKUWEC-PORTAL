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
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert the heavy file into a buffer so Cloudinary can process it
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileBase64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    // Upload to Cloudinary (auto-detects if it is a video or image)
    const result = await cloudinary.uploader.upload(fileBase64, {
      resource_type: "auto", 
      folder: "dekuwec_portal",
    });

    // Return the secure URL and the file type back to the admin frontend
    return NextResponse.json({ 
      url: result.secure_url, 
      resource_type: result.resource_type // Returns 'image' or 'video'
    }, { status: 200 });

  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    return NextResponse.json({ error: "Media upload failed" }, { status: 500 });
  }
}
