"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import {
  Award,
  Camera,
  CheckCircle,
  Flame,
  Loader2,
  Medal,
  Play,
  Sparkles,
  Trophy,
  Users,
  Video,
  X,
} from "lucide-react";
import PublicPageShell from "@/components/PublicPageShell";
import GoogleContinueButton from "@/components/GoogleContinueButton";
import NotifyForm from "@/components/NotifyForm";
import ReelsFeed, { type ReelItem } from "@/components/media/ReelsFeed";
import SnapComposer from "@/components/media/SnapComposer";
import { optimizedImage } from "@/lib/image";

type Snap = {
  _id: string;
  imageUrl?: string;
  videoUrl?: string;
  mediaType?: "image" | "video";
  caption?: string;
  description?: string;
  title?: string;
  photographer?: string;
  fullName?: string;
  userProfilePic?: string;
  clerkId?: string;
  type?: "winner" | "honourable" | "top_submission";
  kind?: "reel" | "story";
  expiresAt?: string;
  eventId?: string;
  eventTitle?: string;
  likes?: string[];
  dislikes?: string[];
  reposts?: string[];
  comments?: { clerkId: string; fullName: string; text: string; createdAt?: string }[];
  createdAt?: string;
};

const typeLabel = (type?: string) => {
  if (type === "winner") return "Weekly winner";
  if (type === "honourable") return "Honourable mention";
  return "Official feature";
};

export default function NatureSnapsClient() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [official, setOfficial] = useState<Snap[]>([]);
  const [community, setCommunity] = useState<Snap[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [toast, setToast] = useState("");
  const [deepLinkId, setDeepLinkId] = useState("");

  const loadSnaps = async () => {
    try {
      const res = await fetch("/api/public/nature-snaps", { cache: "no-store" });
      const data = await res.json();
      setOfficial(Array.isArray(data.snaps) ? data.snaps : []);
      setCommunity(Array.isArray(data.communitySnaps) ? data.communitySnaps : []);
    } catch (error) {
      console.error("Failed to load snaps:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSnaps();
    const id = new URLSearchParams(window.location.search).get("snap");
    if (id) setDeepLinkId(id);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 7000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const toReel = (snap: Snap, officialSnap: boolean): ReelItem => {
    const isVideo = snap.mediaType === "video" || !!snap.videoUrl;
    return {
      id: snap._id,
      src: (isVideo ? snap.videoUrl : snap.imageUrl) || snap.imageUrl || "",
      kind: isVideo ? "video" : "image",
      authorName: snap.fullName || snap.photographer || "DEKUWEC member",
      authorAvatar: snap.userProfilePic,
      authorId: snap.clerkId,
      subtitle: officialSnap
        ? typeLabel(snap.type)
        : snap.kind === "story"
          ? "Story · 7 days"
          : "Member reel",
      badge: officialSnap ? typeLabel(snap.type) : snap.kind === "story" ? "Story · 7 days" : "Member snap",
      isStory: snap.kind === "story",
      expiresAt: snap.expiresAt,
      eventTitle: officialSnap ? undefined : snap.eventTitle,
      caption: snap.caption || snap.description || snap.title,
      createdAt: snap.createdAt,
      likes: snap.likes || [],
      reposts: snap.reposts || [],
      comments: (snap.comments || []).map((entry, index) => ({
        id: `${snap._id}-${index}`,
        clerkId: entry.clerkId,
        name: entry.fullName,
        text: entry.text,
        createdAt: entry.createdAt,
      })),
      href: `/nature-snaps?snap=${snap._id}`,
    };
  };

  const reels = useMemo<ReelItem[]>(() => {
    const memberReels = community
      .filter((snap) => snap.imageUrl || snap.videoUrl)
      .map((snap) => toReel(snap, false));
    const officialReels = official
      .filter((snap) => snap.imageUrl || (snap as Snap).videoUrl)
      .map((snap) => toReel(snap, true));
    return [...memberReels, ...officialReels];
  }, [community, official]);

  const hallOfFame = useMemo(() => {
    const winner = official.filter((snap) => snap.type === "winner").slice(0, 1);
    const honourables = official.filter((snap) => snap.type === "honourable").slice(0, 2);
    return [...winner, ...honourables];
  }, [official]);

  const requireAuth = () => {
    if (!isLoaded) return false;
    if (!isSignedIn) {
      setShowAuth(true);
      return false;
    }
    return true;
  };

  const interact = async (snapId: string, action: string, commentData?: { fullName: string; text: string }) => {
    if (!user) return;
    await fetch("/api/community-snaps/interact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        snapId,
        clerkId: user.id,
        action,
        likerName: user.fullName || user.username || "A member",
        commentData,
      }),
    }).catch(() => loadSnaps());
  };

  const videoCount = reels.filter((item) => item.kind === "video").length;

  return (
    <PublicPageShell active="nature-snaps">
      <section className="hero-mesh animate-gradient relative overflow-hidden rounded-[2rem] px-6 py-10 text-white shadow-2xl sm:px-10 sm:py-14">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-lime-300/20 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] backdrop-blur">
            <Camera className="h-3.5 w-3.5 text-lime-300" /> Nature Snaps · Stories &amp; Snaps
          </span>
          <h1 className="mt-4 max-w-2xl text-3xl font-black leading-[1.08] text-balance sm:text-5xl">
            Nature, in motion.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-emerald-50/90 sm:text-base">
            Swipe through wildlife photos and 12-second videos from DeKUT students. Like, comment, repost and
            share — then post your own moment.
          </p>

          <div className="mt-6 flex flex-wrap gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-2 text-xs font-bold backdrop-blur">
              <Play className="h-3.5 w-3.5 fill-current text-lime-300" /> Tap a story to watch
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-2 text-xs font-bold backdrop-blur">
              <Video className="h-3.5 w-3.5 text-lime-300" /> {videoCount} video snap{videoCount === 1 ? "" : "s"} live
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-2 text-xs font-bold backdrop-blur">
              <Users className="h-3.5 w-3.5 text-lime-300" /> {community.length} member posts
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-2 text-xs font-bold backdrop-blur">
              <Trophy className="h-3.5 w-3.5 text-lime-300" /> Weekly Hall of Fame
            </span>
          </div>
        </div>
      </section>

      {toast ? (
        <div className="animate-pop mt-4 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <span className="break-words">{toast}</span>
        </div>
      ) : null}

      {hallOfFame.length > 0 ? (
        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-black text-emerald-950">
                <Trophy className="h-6 w-6 text-amber-500" /> Hall of Fame
              </h2>
              <p className="text-sm text-muted">Last week&apos;s winner and honourable mentions.</p>
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
              Only 3 photos
            </span>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {hallOfFame.map((snap, index) => (
              <article
                key={snap._id}
                className={`card card-hover animate-rise overflow-hidden ${index === 0 ? "ring-2 ring-amber-300" : ""}`}
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={optimizedImage(snap.imageUrl, 700)}
                    alt={snap.caption || snap.title || "Nature snap"}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
                    {index === 0 ? (
                      <Trophy className="h-3 w-3 text-amber-300" />
                    ) : (
                      <Award className="h-3 w-3 text-emerald-300" />
                    )}
                    {index === 0 ? "1st place" : `Place ${index + 1}`}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="truncate text-sm font-black text-emerald-950">
                    {snap.title || snap.caption || "Nature capture"}
                  </h3>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                    <Medal className="h-3.5 w-3.5 text-emerald-600" />
                    {snap.photographer || snap.fullName || "DEKUWEC member"}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section id="snap-composer" className="mt-8 scroll-mt-24">
        <SnapComposer
          signedIn={!!isSignedIn}
          clerkId={user?.id}
          fullName={user?.fullName || user?.username || undefined}
          profilePic={user?.imageUrl}
          onRequireAuth={() => setShowAuth(true)}
          onPublished={loadSnaps}
          onMessage={setToast}
        />
      </section>

      <section className="mt-10">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
          </div>
        ) : (
          <ReelsFeed
            items={reels}
            currentUserId={user?.id}
            initialOpenId={deepLinkId || undefined}
            storiesTitle="Nature stories"
            onAddStory={() => {
              if (requireAuth()) document.getElementById("snap-composer")?.scrollIntoView({ behavior: "smooth" });
            }}
            onLike={(item, liked) => {
              if (!requireAuth()) return;
              interact(item.id, liked ? "like" : "remove");
            }}
            onRepost={(item) => {
              if (!requireAuth()) return;
              const already = !!user && (item.reposts || []).includes(user.id);
              interact(item.id, already ? "unrepost" : "repost");
            }}
            onComment={(item, text) => {
              if (!requireAuth()) return;
              return interact(item.id, "comment", {
                fullName: user?.fullName || user?.username || "Member",
                text,
              });
            }}
            onShare={() => setToast("Link copied — share the moment with your friends.")}
            emptyState={
              <div className="rounded-3xl border border-dashed border-emerald-200 bg-white p-12 text-center">
                <Camera className="mx-auto h-10 w-10 text-emerald-300" />
                <p className="mt-3 text-sm font-semibold text-slate-500">
                  No snaps yet. Post the first nature moment of the week.
                </p>
              </div>
            }
          />
        )}
      </section>

      <div className="mt-12">
        <div className="space-y-5">
          <EventReminderCardLite />
          <NotifyForm
            title="Never miss a winner"
            description="Add your email for the weekly Hall of Fame and event reminders."
          />
          <div className="card p-5">
            <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-900">
              <Sparkles className="h-4 w-4" /> How the challenge works
            </h3>
            <ol className="mt-3 space-y-2.5 text-sm text-slate-600">
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-black text-emerald-800">
                  1
                </span>
                Snap a photo or record a clip of 12 seconds or less.
              </li>
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-black text-emerald-800">
                  2
                </span>
                Post it — the whole club gets an email and in-app alert.
              </li>
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-black text-emerald-800">
                  3
                </span>
                The executive picks three winners every week.
              </li>
            </ol>
            <Link
              href="/events"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-800"
            >
              <Flame className="h-3.5 w-3.5 text-lime-300" /> Join the next excursion
            </Link>
          </div>
        </div>
      </div>

      {showAuth ? (
        <div
          className="fixed inset-0 z-[85] flex items-center justify-center bg-emerald-950/70 p-4 backdrop-blur-sm"
          onClick={() => setShowAuth(false)}
        >
          <div className="animate-pop w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setShowAuth(false)}
              className="ml-auto flex rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
              aria-label="Close sign in"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <Camera className="h-7 w-7 text-emerald-700" />
            </div>
            <h3 className="mt-4 text-xl font-black text-emerald-950">One tap to join in</h3>
            <p className="mt-2 text-sm text-slate-500">
              Sign in with Google to post, like, comment and repost. No OTP codes.
            </p>
            <div className="mt-5 flex justify-center">
              <GoogleContinueButton redirectTo="/nature-snaps" />
            </div>
          </div>
        </div>
      ) : null}
    </PublicPageShell>
  );
}

function EventReminderCardLite() {
  return (
    <div className="card overflow-hidden">
      <div className="hero-mesh px-5 py-4 text-white">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-lime-200">Weekly rhythm</p>
        <h3 className="mt-1 text-base font-black">Wednesday physical gathering</h3>
        <p className="mt-1 text-xs text-emerald-50/85">5:00 PM – 6:45 PM · Main campus</p>
      </div>
      <div className="p-4">
        <p className="text-xs leading-relaxed text-slate-600">
          Winners are announced at the Wednesday meeting. Bring your best shot and a reusable bottle.
        </p>
      </div>
    </div>
  );
}