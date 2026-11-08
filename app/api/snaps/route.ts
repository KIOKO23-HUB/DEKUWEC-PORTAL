import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import NatureSnap from "@/models/NatureSnap";

/**
 * The Hall of Fame only ever holds three photos: one winner and two honourable
 * mentions. Awarding a new place pushes the previous holders down into the
 * regular gallery instead of deleting them.
 */
async function enforceHallOfFame(snapId: string, type: string) {
  if (type === "winner") {
    await NatureSnap.updateMany(
      { _id: { $ne: snapId }, type: "winner" },
      { $set: { type: "top_submission" } }
    );
    return;
  }

  if (type === "honourable") {
    const honourables = await NatureSnap.find({ type: "honourable", _id: { $ne: snapId } })
      .sort({ createdAt: -1 })
      .select("_id")
      .lean();

    if (honourables.length > 1) {
      const demoted = honourables.slice(1).map((snap: any) => snap._id);
      await NatureSnap.updateMany({ _id: { $in: demoted } }, { $set: { type: "top_submission" } });
    }
  }
}

export async function GET() {
  try {
    await connectToDatabase();
    const snaps = await NatureSnap.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ snaps }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch snaps" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();
    // Save the snap; Mongoose will use the new fields
    const snap = await NatureSnap.create(body);
    await enforceHallOfFame(String(snap._id), snap.type);
    return NextResponse.json({ message: "Snap created", snap }, { status: 201 });
  } catch (error: any) {
    console.error("Nature Snap Post Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create snap" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { id, ...updateData } = await req.json();
    await connectToDatabase();
    const updated = await NatureSnap.findByIdAndUpdate(id, updateData, { new: true });
    if (updated) await enforceHallOfFame(String(updated._id), updated.type);
    return NextResponse.json({ message: "Snap updated", snap: updated }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update snap" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    await connectToDatabase();
    await NatureSnap.findByIdAndDelete(id);
    return NextResponse.json({ message: "Snap deleted" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete snap" }, { status: 500 });
  }
}