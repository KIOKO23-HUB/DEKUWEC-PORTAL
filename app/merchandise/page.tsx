import type { Metadata } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import Merchandise from "@/models/Merchandise";
import MerchandiseClient from "./MerchandiseClient";

export const dynamic = "force-dynamic";

type MerchLike = { title?: string; description?: string; imageUrl?: string };

export async function generateMetadata({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}): Promise<Metadata> {
  const itemId = Array.isArray(searchParams.item) ? searchParams.item[0] : searchParams.item;

  let image = "/dekut-aerial.jpg";
  let title = "DEKUWEC Merchandise | Official Club Gear";
  let description =
    "Order official DEKUWEC t-shirts, hoodies and caps. No portal account needed — pay via M-Pesa and collect at the Wednesday meeting.";

  try {
    await connectToDatabase();
    const item =
      itemId && /^[a-f\d]{24}$/i.test(itemId)
        ? await Merchandise.findById(itemId).lean<MerchLike>()
        : await Merchandise.findOne({}).sort({ createdAt: -1 }).lean<MerchLike>();

    if (item) {
      if (item.imageUrl) image = item.imageUrl;
      if (item.title) title = `${item.title} | DEKUWEC Merchandise`;
      if (item.description) description = item.description;
    }
  } catch {
    // Fall back to the campus image.
  }

  return {
    title,
    description,
    openGraph: { title, description, type: "website", images: [{ url: image, alt: "DEKUWEC merchandise" }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function MerchandisePage() {
  return <MerchandiseClient />;
}
