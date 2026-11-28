"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import {
  ArrowRight,
  CalendarDays,
  Camera,
  CreditCard,
  Flame,
  HelpCircle,
  Radio,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import ReelsFeed, { type ReelItem } from "@/components/media/ReelsFeed";
import { EcoSpotlightCard, EventReminderCard } from "@/components/EcoSpotlight";
import { eventToReels, snapToReel, type EventSource, type SnapSource } from "@/lib/reels";

const HUBS = [
  { href: "/dashboard/events", label: "Events", icon: CalendarDays, tone: "bg-emerald-50 text-emerald-700" },
  { href: "/dashboard/snaps", label: "Snaps", icon: Camera, tone: "bg-amber-50 text-amber-700" },
  { href: "/dashboard/dispatch", label: "EcoPulse", icon: Radio, tone: "bg-sky-50 text-sky-700" },
  { href: "/dashboard/membership", label: "Membership", icon: Users, tone: "bg-violet-50 text-violet-700" },
  { href: "/dashboard/merchandise", label: "Shop", icon: ShoppingBag, tone: "bg-rose-50 text-rose-700" },
  { href: "/dashboard/wck-card", label: "WCK Card", icon: CreditCard, tone: "bg-teal-50 text-teal-700" },
  { href: "/dashboard/support", label: "Support", icon: HelpCircle, tone: "bg-slate-100 text-slate-700" },
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardHomePage() {
  const { user } = useUser();
  const [events, setEvents] = useState<EventSource[]>([]);
  const [official, setOfficial] = useState<SnapSource[]>([]);
  const [community, setCommunity] = useState<SnapSource[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [eventsRes, snapsRes, communityRes] = await Promise.all([
        fetch("/api/public/events", { cache: "no-store" }).catch(() => null),
        fetch("/api/snaps", { cache: "no-store" }).catch(() => null),
        fetch("/api/community-snaps", { cache: "no-store" }).catch(() => null),
      ]);
      const eventsData = eventsRes?.ok ? await eventsRes.json() : null;
      const snapsData = snapsRes?.ok ? await snapsRes.json() : null;
      const communityData = communityRes?.ok ? await communityRes.json() : null;

      setEvents(Array.isArray(eventsData?.events) ? eventsData.events : []);
      setOfficial(Array.isArray(snapsData?.snaps) ? snapsData.snaps : []);
      setCommunity(Array.isArray(communityData?.snaps) ? communityData.snaps : []);
    } catch (error) {
      console.error("Dashboard feed error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const feed = useMemo<ReelItem[]>(() => {
    const snaps = [...community, ...official]
      .slice(0, 6)
      .map((snap, index) => snapToReel(snap, index >= community.length))
      .filter(Boolean) as ReelItem[];
    const eventReels = events
      .filter((event) => event.imageUrl || (event.media && event.media.length))
      .slice(0, 3)
      .flatMap((event) => eventToReels(event))
      .slice(0, 4);
    return [...snaps, ...eventReels].slice(0, 8);
  }, [community, official, events]);

  const handleInteraction = (item: ReelItem, action: string, commentData?: { fullName: string; text: string }) => {
    const isEvent = /^[a-f\d]{24}-/i.test(item.id);
    const targetId = isEvent ? item.id.split("-")[0] : item.id;
    const endpoint = isEvent ? "/api/events/interact" : "/api/community-snaps/interact";
    const payload = isEvent
      ? { eventId: targetId, clerkId: user?.id, action, commentData }
      : {
          snapId: targetId,
          clerkId: user?.id,
          action,
          likerName: user?.fullName || "A member",
          commentData,
        };
    return fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(() => load())
      .catch(() => {});
  };

  const weeklyPosts = community.filter((snap) => {
    if (!snap.createdAt) return false;
    return Date.now() - new Date(snap.createdAt).getTime() < 7 * 86_400_000;
  }).length;

  const nextEvent = events.find((event) => event.imageUrl);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-7 lg:p-9">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="mt-1 text-2xl font-black text-emerald-950 sm:text-3xl">
            {greeting()}
            {user?.firstName ? `, ${user.firstName}` : ""} 🌿
          </h1>
          <p className="mt-1 text-sm text-muted">
            Your conservation feed — snaps, events and today&apos;s eco briefing.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/snaps"
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-900 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-800"
          >
            <Camera className="h-4 w-4 text-lime-300" /> Post a snap
          </Link>
          <Link
            href="/events"
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-4 py-2.5 text-xs font-bold text-emerald-900 transition hover:bg-emerald-50"
          >
            <Flame className="h-4 w-4 text-amber-500" /> Upcoming events
          </Link>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "New snaps this week", value: weeklyPosts, icon: TrendingUp, tone: "text-emerald-700" },
          { label: "Upcoming events", value: events.length, icon: CalendarDays, tone: "text-sky-700" },
          { label: "Active members", value: Math.max(community.length, official.length), icon: Users, tone: "text-violet-700" },
        ].map((stat, index) => (
          <div
            key={stat.label}
            className="card animate-rise flex items-center gap-3 p-4"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 ${stat.tone}`}>
              <stat.icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xl font-black leading-none text-emerald-950">{stat.value}</p>
              <p className="mt-1 text-[11px] font-semibold text-muted">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {loading ? (
            <div className="space-y-5">
              <div className="skeleton h-24 rounded-3xl" />
              <div className="skeleton aspect-[4/5] rounded-3xl" />
            </div>
          ) : (
            <ReelsFeed
              items={feed}
              currentUserId={user?.id}
              storiesTitle="Stories from the club"
              onAddStory={() => {
                window.location.href = "/dashboard/snaps";
              }}
              onLike={(item, liked) => {
                const isEvent = /^[a-f\d]{24}-/i.test(item.id);
                handleInteraction(item, isEvent ? (liked ? "like" : "unlike") : liked ? "like" : "remove");
              }}
              onRepost={(item) => {
                if (/^[a-f\d]{24}-/i.test(item.id)) return;
                const already = !!user && (item.reposts || []).includes(user.id);
                handleInteraction(item, already ? "unrepost" : "repost");
              }}
              onComment={(item, text) =>
                handleInteraction(item, "comment", {
                  fullName: user?.fullName || user?.username || "Member",
                  text,
                }).then(() => undefined)
              }
              emptyState={
                <div className="card p-10 text-center">
                  <Camera className="mx-auto h-10 w-10 text-emerald-300" />
                  <p className="mt-3 text-sm font-semibold text-slate-500">
                    The feed is warming up. Post the first nature moment.
                  </p>
                  <Link
                    href="/dashboard/snaps"
                    className="mt-3 inline-flex rounded-full bg-emerald-800 px-4 py-2 text-xs font-bold text-white"
                  >
                    Create a snap
                  </Link>
                </div>
              }
            />
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <section className="card overflow-hidden">
            <div className="hero-mesh h-16" />
            <div className="-mt-8 px-4 pb-4">
              {user?.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={user.fullName || "Member"}
                  className="h-16 w-16 rounded-full border-4 border-white object-cover shadow"
                />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-emerald-100 text-xl font-black text-emerald-800 shadow">
                  {(user?.firstName?.[0] || "D").toUpperCase()}
                </span>
              )}
              <h2 className="mt-2 text-sm font-black text-emerald-950">
                {user?.fullName || user?.username || "DEKUWEC member"}
              </h2>
              <p className="text-[11px] font-semibold text-muted">
                {user?.primaryEmailAddress?.emailAddress || "Conservation community"}
              </p>
              <div className="mt-3 flex gap-2">
                <Link
                  href="/dashboard/account"
                  className="flex-1 rounded-xl bg-emerald-900 px-3 py-2 text-center text-[11px] font-bold text-white transition hover:bg-emerald-800"
                >
                  My account
                </Link>
                <Link
                  href="/dashboard/snaps"
                  className="flex-1 rounded-xl border border-emerald-200 px-3 py-2 text-center text-[11px] font-bold text-emerald-800 transition hover:bg-emerald-50"
                >
                  My snaps
                </Link>
              </div>
            </div>
          </section>

          <EcoSpotlightCard />
          <EventReminderCard />

          {nextEvent ? (
            <Link
              href="/dashboard/events"
              className="card card-hover block overflow-hidden"
            >
              <div className="relative h-28">
                <img
                  src={nextEvent.imageUrl}
                  alt={nextEvent.title}
                  className="h-full w-full object-cover"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-emerald-950/85 to-transparent" />
                <span className="absolute bottom-2 left-3 right-3 truncate text-xs font-black text-white">
                  {nextEvent.title}
                </span>
              </div>
              <p className="flex items-center justify-between px-3 py-2 text-[11px] font-bold text-emerald-800">
                Featured activity <ArrowRight className="h-3.5 w-3.5" />
              </p>
            </Link>
          ) : null}

          <section className="card p-4">
            <h2 className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
              <Sparkles className="h-3.5 w-3.5" /> Quick access
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {HUBS.map((hub) => (
                <Link
                  key={hub.href}
                  href={hub.href}
                  className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-[11px] font-bold transition hover:brightness-95 ${hub.tone}`}
                >
                  <hub.icon className="h-4 w-4" /> {hub.label}
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}