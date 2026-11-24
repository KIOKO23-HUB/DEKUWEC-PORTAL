import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import EventItem from "@/models/EventItem";
import CommunitySnap from "@/models/CommunitySnap";

export const dynamic = "force-dynamic";

/**
 * EcoPulse AI guide.
 *
 * Composes short, factual conservation prompts and event reminders from a
 * curated knowledge base plus live club data. It is deterministic per day/hour
 * so members see a stable, relevant spotlight, and needs no external model key.
 */
const SPOTLIGHTS = [
  {
    emoji: "🐘",
    tag: "Wildlife spotlight",
    title: "Elephants plant forests as they walk",
    fact: "A single African elephant can disperse seeds across dozens of kilometres in its dung, making herds genuine forest gardeners across the Aberdare landscape.",
    action: "Keep wildlife corridors open: never block or litter seasonal routes near the campus boundary.",
    cta: { label: "See member sightings", href: "/nature-snaps" },
  },
  {
    emoji: "🦜",
    tag: "Species focus",
    title: "The mountain bongo is fighting for its ridges",
    fact: "Fewer than 100 mountain bongo remain in the wild, mostly in the Aberdare and Mount Kenya forests. Every hectare of restored indigenous canopy is a lifeline for them.",
    action: "Join the next indigenous tree-planting drive — canopy cover is bongo habitat.",
    cta: { label: "Check upcoming events", href: "/events" },
  },
  {
    emoji: "🐆",
    tag: "Ecosystem story",
    title: "Predators keep the highlands healthy",
    fact: "Leopards and servals control herbivore numbers, which protects young saplings. Remove the predator and the forest slowly loses its next generation of trees.",
    action: "Report snares and illegal traps to the club or Kenya Wildlife Service instead of intervening alone.",
    cta: { label: "Read EcoPulse", href: "/dashboard/dispatch" },
  },
  {
    emoji: "🌿",
    tag: "Water tower watch",
    title: "The Aberdares feed millions of taps",
    fact: "The Aberdare Range supplies water to Nairobi and much of Central Kenya. Its bamboo belt works like a sponge, releasing clean water long after the rains stop.",
    action: "Cut single-use plastic on hikes — mountain litter travels straight into our rivers.",
    cta: { label: "Join a cleanup", href: "/events" },
  },
  {
    emoji: "🦩",
    tag: "Wetland note",
    title: "Flamingos are a water-quality alarm",
    fact: "Flamingo flocks abandon lakes when water chemistry shifts. Their presence is one of the cheapest indicators of a healthy alkaline wetland.",
    action: "Never pour soap or chemicals into streams — every drain on campus leads somewhere.",
    cta: { label: "Share a snap", href: "/nature-snaps" },
  },
  {
    emoji: "🌳",
    tag: "Campus action",
    title: "One indigenous tree, forty species",
    fact: "A mature fig or croton can host dozens of bird, bat and insect species. Exotic ornamentals support far fewer.",
    action: "Ask the club for an indigenous seedling for your hall or home compound.",
    cta: { label: "Tree nursery projects", href: "/dashboard/events" },
  },
  {
    emoji: "🐝",
    tag: "Pollinator alert",
    title: "Small pollinators run the food system",
    fact: "Bees, hoverflies and sunbirds pollinate most of Kenya's food crops and wild plants. Pesticide drift is one of their fastest-growing threats.",
    action: "Keep flowering plants around your residence and avoid spraying during the day.",
    cta: { label: "Nature Snaps gallery", href: "/nature-snaps" },
  },
  {
    emoji: "🌍",
    tag: "Climate lens",
    title: "Highland forests cool the whole region",
    fact: "Restoring degraded highland forest can lower local surface temperatures and stabilise rainfall patterns far beyond the tree line.",
    action: "Walk or carpool to club activities — transport is the club's largest footprint.",
    cta: { label: "EcoPulse Dispatch", href: "/dashboard/dispatch" },
  },
];

const TIPS = [
  "Carry a reusable bottle and refuse single-use plastic on every excursion.",
  "Photograph wildlife from a distance — a selfie is never worth an animal's stress.",
  "Plant indigenous species such as croton, fig and prunus africana.",
  "Report snares, charcoal kilns or illegal logging to KWS on 0800 597 000.",
  "Switch off lights and unplug chargers when leaving your hostel room.",
  "Share one wildlife fact a week — awareness spreads faster than campaigns.",
  "Keep campus streams clean; they feed the rivers downstream communities drink from.",
];

const REMINDER_OPENERS = [
  "Don't miss it",
  "Mark your calendar",
  "Coming up",
  "Save your spot",
];

function seed() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const day = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  return day * 5 + now.getHours();
}

function parseEventDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET() {
  const index = seed();
  const spotlight = SPOTLIGHTS[index % SPOTLIGHTS.length];
  const tip = TIPS[index % TIPS.length];
  const tips = [0, 2, 4, 5, 6].map((offset) => TIPS[(index + offset) % TIPS.length]);

  let reminder: {
    title: string;
    date: string;
    location: string;
    daysLeft: number | null;
    message: string;
    href: string;
  } | null = null;

  let recentPosts = 0;
  let latestCaption = "";

  try {
    await connectToDatabase();
    const [events, postCount, latest] = await Promise.all([
      EventItem.find({ category: "upcoming" }).select("title date time location").limit(12).lean(),
      CommunitySnap.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 86_400_000) } }),
      CommunitySnap.findOne({}).sort({ createdAt: -1 }).select("caption").lean(),
    ]);

    recentPosts = postCount;
    latestCaption = String((latest as { caption?: string } | null)?.caption || "");

    const withDates = (events as any[])
      .map((event) => ({ ...event, parsed: parseEventDate(event.date) }))
      .filter((event) => event.parsed && event.parsed.getTime() >= Date.now() - 86_400_000)
      .sort((a, b) => (a.parsed as Date).getTime() - (b.parsed as Date).getTime());

    const next = withDates[0];
    if (next) {
      const daysLeft = Math.max(
        0,
        Math.ceil(((next.parsed as Date).getTime() - Date.now()) / 86_400_000)
      );
      const opener = REMINDER_OPENERS[index % REMINDER_OPENERS.length];
      reminder = {
        title: String(next.title || "Club event"),
        date: String(next.date || ""),
        location: String(next.location || ""),
        daysLeft,
        message:
          daysLeft === 0
            ? `${opener}: this happens today. Bring a friend and your reusable bottle.`
            : `${opener}: ${daysLeft} day${daysLeft === 1 ? "" : "s"} to go. Slots close fast.`,
        href: "/events",
      };
    }
  } catch (error) {
    console.error("EcoPulse AI data error:", error);
  }

  return NextResponse.json(
    {
      spotlight,
      tip,
      tips,
      reminder,
      pulse: {
        weeklyPosts: recentPosts,
        latestCaption,
        message:
          recentPosts > 0
            ? `${recentPosts} new nature snap${recentPosts === 1 ? "" : "s"} shared this week by the club.`
            : "No snaps this week yet — be the first to post a moment.",
      },
      generatedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=900" } }
  );
}
