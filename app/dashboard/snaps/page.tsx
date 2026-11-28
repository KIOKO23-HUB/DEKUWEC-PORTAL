"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Award, Camera, CheckCircle, Loader2, Trophy, Video, Zap } from "lucide-react";
import ReelsFeed, { type ReelItem } from "@/components/media/ReelsFeed";
import SnapComposer from "@/components/media/SnapComposer";
import { snapToReel, type SnapSource } from "@/lib/reels";
import { optimizedImage } from "@/lib/image";

export default function DashboardSnapsPage() {
  const { user, isLoaded } = useUser();
  const [official, setOfficial] = useState<SnapSource[]>([]);
  const [community, setCommunity] = useState<SnapSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  const loadSnaps = async () => {
    try {
      const [officialRes, communityRes] = await Promise.all([
        fetch("/api/snaps", { cache: "no-store" }).then((res) => res.json()),
        fetch("/api/community-snaps", { cache: "no-store" }).then((res) => res.json()),
      ]);
      setOfficial(Array.isArray(officialRes.snaps) ? officialRes.snaps : []);
      setCommunity(Array.isArray(communityRes.snaps) ? communityRes.snaps : []);
    } catch (error) {
      console.error("Failed to load snaps:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSnaps();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 6500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const reels = useMemo<ReelItem[]>(() => {
    const member = community.map((snap) => snapToReel(snap, false)).filter(Boolean) as ReelItem[];
    const officialItems = official.map((snap) => snapToReel(snap, true)).filter(Boolean) as ReelItem[];
    return [...member, ...officialItems];
  }, [community, official]);

  const hallOfFame = useMemo(
    () => official.filter((snap) => snap.type === "winner" || snap.type === "honourable").slice(0, 3),
    [official]
  );

  const interact = async (
    snapId: string,
    action: string,
    commentData?: { fullName: string; text: string }
  ) => {
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

  const myPosts = community.filter((snap) => snap.clerkId === user?.id).length;
  const reelsCount = reels.filter((item) => item.kind === "video").length;

  return (
    <div className="mx-auto max-w-6xl space-y-7 p-4 sm:p-8 lg:p-10">
      <header className="flex flex-col gap-4 border-b border-emerald-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Nature Snaps</p>
          <h1 className="mt-1 text-2xl font-black text-emerald-950 sm:text-3xl">Your nature snaps</h1>
          <p className="mt-1 text-sm text-muted">
            Photos and 12-second clips from members and the official gallery.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
            <Video className="h-3.5 w-3.5" /> {reelsCount} video snaps
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-50 px-3 py-2 text-xs font-bold text-lime-800">
            <Camera className="h-3.5 w-3.5" /> {myPosts} yours
          </span>
          <Link
            href="/nature-snaps"
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-800"
          >
            <Zap className="h-3.5 w-3.5 text-lime-300" /> Public wall
          </Link>
        </div>
      </header>

      {toast ? (
        <div className="animate-pop flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <span>{toast}</span>
        </div>
      ) : null}

      {hallOfFame.length > 0 ? (
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-emerald-50 px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-black text-emerald-950">
              <Trophy className="h-4 w-4 text-amber-500" /> Hall of Fame
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">This week</span>
          </div>
          <div className="scrollbar-hide flex gap-3 overflow-x-auto p-4">
            {hallOfFame.map((snap, index) => (
              <div key={snap._id} className="w-40 shrink-0">
                <div className="relative aspect-square overflow-hidden rounded-2xl bg-emerald-950">
                  <img
                    src={optimizedImage(snap.imageUrl, 400)}
                    alt={snap.title || snap.caption || "Nature snap"}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <span className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
                    {index === 0 ? "Winner" : <Award className="inline h-3 w-3" />}
                  </span>
                </div>
                <p className="mt-1.5 truncate text-xs font-bold text-emerald-950">
                  {snap.photographer || snap.fullName || "Member"}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="skeleton aspect-[4/5] rounded-3xl" />
              <div className="skeleton aspect-[4/5] rounded-3xl" />
            </div>
          ) : (
            <ReelsFeed
              items={reels}
              currentUserId={user?.id}
              storiesTitle="Campus stories"
              onAddStory={() =>
                document.getElementById("dashboard-composer")?.scrollIntoView({ behavior: "smooth" })
              }
              onLike={(item, liked) => interact(item.id, liked ? "like" : "remove")}
              onRepost={(item) => {
                const already = !!user && (item.reposts || []).includes(user.id);
                interact(item.id, already ? "unrepost" : "repost");
              }}
              onComment={(item, text) =>
                interact(item.id, "comment", {
                  fullName: user?.fullName || user?.username || "Member",
                  text,
                })
              }
              onShare={() => setToast("Share link copied.")}
              emptyState={
                <div className="rounded-3xl border border-dashed border-emerald-200 bg-white p-12 text-center">
                  <Camera className="mx-auto h-10 w-10 text-emerald-300" />
                  <p className="mt-3 text-sm font-semibold text-slate-500">
                    No snaps yet — post the first one below.
                  </p>
                </div>
              }
            />
          )}
        </div>

        <div id="dashboard-composer" className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <SnapComposer
            signedIn={isLoaded && !!user}
            clerkId={user?.id}
            fullName={user?.fullName || user?.username || undefined}
            profilePic={user?.imageUrl}
            onRequireAuth={() => setToast("Sign in to post your own snap.")}
            onPublished={loadSnaps}
            onMessage={setToast}
          />
          <div className="card p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">Reel tips</p>
            <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-600">
              <li>Keep clips under 12 seconds — vertical (9:16) looks best.</li>
              <li>Get close to the subject, never to the animal.</li>
              <li>Double-tap a card to like it instantly.</li>
            </ul>
          </div>
        </div>
      </div>

      {!isLoaded ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
        </div>
      ) : null}
    </div>
  );
}