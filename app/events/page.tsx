import type { Metadata } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import EventItem from "@/models/EventItem";
import EventsClient from "./EventsClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}): Promise<Metadata> {
  const title = "Upcoming Events | DEKUWEC";
  const description =
    "Register and pay for Dedan Kimathi Wildlife & Environmental Club events via M-Pesa. No portal account needed.";

  let image = "/dekut-aerial.jpg";
  let pageTitle = title;
  let pageDescription = description;
  const eventId = Array.isArray(searchParams.event) ? searchParams.event[0] : searchParams.event;
  try {
    await connectToDatabase();
    const query: Record<string, unknown> = { category: "upcoming" };
    if (eventId && /^[a-f\d]{24}$/i.test(eventId)) {
      query._id = eventId;
    } else {
      query.imageUrl = { $nin: [null, ""] };
    }
    const latest = await EventItem.findOne(query)
      .sort({ createdAt: -1 })
      .lean<{ title?: string; description?: string; imageUrl?: string }>();
    if (latest?.imageUrl) {
      image = latest.imageUrl;
      pageTitle = `${latest.title || "Upcoming Event"} | DEKUWEC`;
      pageDescription = latest.description || description;
    }
  } catch {
    // Fall back to the campus image.
  }

  return {
    title: pageTitle,
    description: pageDescription,
    openGraph: { title: pageTitle, description: pageDescription, type: "website", images: [{ url: image, alt: "DEKUWEC event" }] },
    twitter: { card: "summary_large_image", title: pageTitle, description: pageDescription, images: [image] },
  };
}

export default function EventsPage() {
  return <EventsClient />;
}
