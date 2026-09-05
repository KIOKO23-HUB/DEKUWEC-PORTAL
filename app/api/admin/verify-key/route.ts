import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { key } = await req.json();
    const expectedKey = process.env.ADMIN_SECRET_KEY;

    if (!expectedKey) {
      return NextResponse.json({ error: "Server admin key not configured" }, { status: 500 });
    }

    if (key === expectedKey) {
      return NextResponse.json({ success: true }, { status: 200 });
    } else {
      return NextResponse.json({ error: "Invalid Security Key" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
