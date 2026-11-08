import type { Metadata } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import CommunitySnap from "@/models/CommunitySnap";
import NatureSnap from "@/models/NatureSnap";
import NatureSnapsClient from "./NatureSnapsClient";

export const dynamic = "force-dynamic";

const FALLBACK_IMAGE = "/dekut-aerial.jpg";

type SnapLike = {
  imageUrl?: string;
  caption?: string;
  description?: string;
  title?: string;
  fullName?: string;
  photographer?: string;
};

async function safeFindById(id: string) {
  if (!id || !/^[a-f\d]{24}$/i.test(id)) return null;
  try {
    await connectToDatabase();
    return (
      (await CommunitySnap.findById(id).lean<SnapLike>()) ||
      (await NatureSnap.findById(id).lean<SnapLike>())
    );
  } catch {
    return null;
  }
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}): Promise<Metadata> {
  const snapId = Array.isArray(searchParams.snap) ? searchParams.snap[0] : searchParams.snap;

  let image = FALLBACK_IMAGE;
  let title = "Nature Snaps | DEKUWEC";
  let description =
    "Weekly wildlife and nature photography from Dedan Kimathi University students. Vote, share and upload your snap.";

  const snap = snapId ? await safeFindById(snapId) : null;

  if (snap) {
    image = snap.imageUrl || image;
    const author = snap.fullName || snap.photographer || "A DEKUWEC member";
    title = `${author}'s Nature Snap | DEKUWEC`;
    description = snap.caption || snap.description || snap.title || description;
  } else {
    try {
      await connectToDatabase();
      const latest = await CommunitySnap.findOne({}).sort({ createdAt: -1 }).lean<SnapLike>();
      if (latest?.imageUrl) image = latest.imageUrl;
    } catch {
      // Keep the campus fallback image.
    }
  }

  const ogImage = image;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: [{ url: ogImage, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
  };
}

export default function NatureSnapsPage() {
  return <NatureSnapsClient />;
}
