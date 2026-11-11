import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_HOSTS = new Set(["res.cloudinary.com"]);

/** Same-origin image proxy used only to keep poster canvases untainted. */
export async function GET(req: Request) {
  try {
    const raw = new URL(req.url).searchParams.get("url");
    if (!raw) return NextResponse.json({ error: "url is required." }, { status: 400 });

    const target = new URL(raw);
    if (target.protocol !== "https:" || !ALLOWED_HOSTS.has(target.hostname)) {
      return NextResponse.json({ error: "Image host is not allowed." }, { status: 400 });
    }

    const upstream = await fetch(target.toString(), { cache: "no-store" });
    if (!upstream.ok) {
      return NextResponse.json({ error: "Image could not be fetched." }, { status: 502 });
    }

    return new NextResponse(await upstream.arrayBuffer(), {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid image request." }, { status: 400 });
  }
}
