import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Merchandise from "@/models/Merchandise";
import MerchandiseOrder from "@/models/MerchandiseOrder";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectToDatabase();
    const items = await Merchandise.find({}).sort({ createdAt: -1 });
    const orders = await MerchandiseOrder.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ items, orders });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load admin merch" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const data = await req.json();
    const item = await Merchandise.create(data);
    return NextResponse.json({ success: true, item });
  } catch (error) {
    return NextResponse.json({ error: "Failed to add merchandise" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await connectToDatabase();
    const { id, ...updates } = await req.json();
    const item = await Merchandise.findByIdAndUpdate(id, updates, { new: true });
    return NextResponse.json({ success: true, item });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update merchandise" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    await Merchandise.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete merchandise" }, { status: 500 });
  }
}