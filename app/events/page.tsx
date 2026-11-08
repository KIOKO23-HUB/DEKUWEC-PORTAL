import type { Metadata } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import EventItem from "@/models/EventItem";
import EventsClient from "./EventsClient";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const title = "Upcoming Events | DEKUWEC";
  const description =
    "Register and pay for Dedan Kimathi Wildlife & Environmental Club events via M-Pesa. No portal account needed.";

  let image = "/dekut-aerial.jpg";
  try {
    await connectToDatabase();
    // Share cards always show the most recently updated event image.
    const latest = await EventItem.findOne({ imageUrl: { $nin: [null, ""] } })
      .sort({ createdAt: -1 })
      .lean<{ imageUrl?: string }>();
    if (latest?.imageUrl) image = latest.imageUrl;
  } catch {
    // Fall back to the campus image.
  }

  return {
    title,
    description,
    openGraph: { title, description, type: "website", images: [{ url: image, alt: "DEKUWEC event" }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function EventsPage() {
  return <EventsClient />;
}
