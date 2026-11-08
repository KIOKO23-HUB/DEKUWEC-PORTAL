"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Camera, Trophy, Award, Medal, Loader2, X, UploadCloud, Share2,
  CheckCircle, Sparkles, Image as ImageIcon, ThumbsUp, ThumbsDown, Users,
} from "lucide-react";
import PublicPageShell from "@/components/PublicPageShell";
import GoogleContinueButton from "@/components/GoogleContinueButton";
import NotifyForm from "@/components/NotifyForm";
import { uploadImage } from "@/lib/clientUpload";
import { optimizedImage } from "@/lib/image";

type Snap = {
  _id: string;
  imageUrl: string;
  caption?: string;
  description?: string;
  title?: string;
  photographer?: string;
  fullName?: string;
  userProfilePic?: string;
  type?: "winner" | "honourable" | "top_submission";
  likes?: string[];
  dislikes?: string[];
  createdAt?: string;
};

const typeLabel = (type?: string) => {
  if (type === "winner") return "Winner";
  if (type === "honourable") return "Honourable Mention";
  return "Official Feature";
};

export default function NatureSnapsClient() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [official, setOfficial] = useState<Snap[]>([]);
  const [community, setCommunity] = useState<Snap[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<Snap | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadForm, setUploadForm] = useState({ imageUrl: "", caption: "" });
  const [toast, setToast] = useState("");
  const [copiedId, setCopiedId] = useState("");

  const browseRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);

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
  }, []);

  // Deep link support: /nature-snaps?snap=<id>
  useEffect(() => {
    if (loading) return;
    const id = new URLSearchParams(window.location.search).get("snap");
    if (!id) return;
    const match = [...community, ...official].find((snap) => snap._id === id);
    if (match) setPreview(match);
  }, [loading, community, official]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  const hallOfFame = useMemo(() => {
    const winner = official.filter((snap) => snap.type === "winner").slice(0, 1);
    let honourables = official.filter((snap) => snap.type === "honourable").slice(0, 2);
    if (honourables.length < 2) {
      const fallback = official
        .filter((snap) => snap.type === "top_submission")
        .slice(0, 2 - honourables.length);
      honourables = [...honourables, ...fallback];
    }
    return { winner: winner[0], honourables };
  }, [official]);

  const hallIds = new Set(
    [hallOfFame.winner?._id, ...hallOfFame.honourables.map((snap) => snap._id)].filter(Boolean)
  );
  const gallery = official.filter((snap) => !hallIds.has(snap._id));

  const requireAuth = (openPicker: () => void) => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setShowAuth(true);
      return;
    }
    openPicker();
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadImage(file);
      setUploadForm((prev) => ({ ...prev, imageUrl: url }));
    } catch (error: any) {
      setToast(error?.message || "Could not upload that photo. Try again.");
    } finally {
      setUploading(false);
    }
  };

  const publishSnap = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isSignedIn || !user) {
      setShowAuth(true);
      return;
    }
    if (!uploadForm.imageUrl) {
      setToast("Add a photo first.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/community-snaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: user.id,
          fullName: user.fullName || user.username || "Member",
          userProfilePic: user.imageUrl,
          imageUrl: uploadForm.imageUrl,
          caption: uploadForm.caption,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not publish your snap.");

      const link = `${window.location.origin}/nature-snaps?snap=${data.snap?._id || ""}`;
      setUploadForm({ imageUrl: "", caption: "" });
      setToast(`Thanks for posting! 🌿 ${data.message || "Your snap is live."} Share it: ${link}`);
      await loadSnaps();
    } catch (error: any) {
      setToast(error?.message || "Could not publish your snap.");
    } finally {
      setSubmitting(false);
    }
  };

  const shareSnap = async (snap: Snap) => {
    const url = `${window.location.origin}/nature-snaps?snap=${snap._id}`;
    const text = `${snap.fullName || snap.photographer || "A member"} shared a nature snap on DEKUWEC`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "DEKUWEC Nature Snaps", text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopiedId(snap._id);
      setTimeout(() => setCopiedId(""), 2500);
    } catch {
      // User dismissed the share sheet.
    }
  };

  return (
    <PublicPageShell active="nature-snaps">
      <section className="rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-emerald-900 p-6 text-white shadow-xl sm:p-10">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider">
          <Camera className="h-3.5 w-3.5" /> Weekly Nature Snap Challenge
        </span>
        <h1 className="mt-4 text-3xl font-black leading-tight sm:text-5xl">
          Capture nature. Share it. Win the week.
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-emerald-100 sm:text-base">
          Every DEKUWEC member can post a snap straight from the camera. The top three photos of the week
          are featured in the Hall of Fame while everything else stays in the gallery.
        </p>
      </section>

      {toast ? (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-emerald-300 bg-white p-4 text-sm font-semibold text-emerald-800 shadow-sm">
          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <span className="break-words">{toast}</span>
        </div>
      ) : null}

      {/* Hall of Fame — last week's winner + 2 honourable mentions */}
      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-black text-emerald-950">
              <Trophy className="h-6 w-6 text-amber-500" /> Hall of Fame
            </h2>
            <p className="text-sm text-gray-500">Last week&apos;s winner and two honourable mentions.</p>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
            Only 3 photos
          </span>
        </div>

        {loading ? (
          <div className="mt-6 flex justify-center py-10">
            <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
          </div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[hallOfFame.winner, ...hallOfFame.honourables].filter(Boolean).map((snap, index) => (
              <article
                key={snap!._id}
                className={`group relative overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ${
                  index === 0 ? "ring-2 ring-amber-400 md:col-span-1" : "ring-emerald-100"
                }`}
              >
                <button type="button" onClick={() => setPreview(snap!)} className="block w-full text-left">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={optimizedImage(snap!.imageUrl, 700)}
                      alt={snap!.caption || snap!.title || "Nature snap"}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-bold text-white">
                      {index === 0 ? <Trophy className="h-3 w-3 text-amber-300" /> : <Award className="h-3 w-3 text-emerald-300" />}
                      {index === 0 ? "1st Place" : `${index + 1}${index === 1 ? "nd" : "rd"} Place`}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="truncate text-base font-black text-emerald-950">
                      {snap!.title || snap!.caption || "Nature capture"}
                    </h3>
                    <p className="mt-0.5 flex items-center gap-1 text-sm text-gray-500">
                      <Medal className="h-3.5 w-3.5 text-emerald-600" />
                      {snap!.photographer || snap!.fullName || "DEKUWEC member"}
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => shareSnap(snap!)}
                  className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-emerald-800 shadow hover:bg-white"
                  aria-label="Share this snap"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </article>
            ))}
            {!hallOfFame.winner && hallOfFame.honourables.length === 0 ? (
              <div className="md:col-span-3 rounded-3xl border border-dashed border-emerald-200 bg-white p-10 text-center">
                <Trophy className="mx-auto h-10 w-10 text-emerald-300" />
                <p className="mt-3 text-sm font-semibold text-gray-500">
                  This week&apos;s winners will appear here as soon as the executive announces them.
                </p>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* Upload */}
        <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-black text-emerald-950">
            <Sparkles className="h-5 w-5 text-emerald-600" /> Upload your nature snap
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Shoot with your camera or pick a photo from your device. Everyone gets notified when you post.
          </p>

          <form onSubmit={publishSnap} className="mt-5 space-y-4">
            <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/60">
              {uploadForm.imageUrl ? (
                <div className="relative aspect-video">
                  <img src={optimizedImage(uploadForm.imageUrl, 900)} alt="Upload preview" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setUploadForm((prev) => ({ ...prev, imageUrl: "" }))}
                    className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white hover:bg-black"
                    aria-label="Remove photo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                  <ImageIcon className="h-9 w-9 text-emerald-400" />
                  <p className="text-sm font-semibold text-emerald-800">Add a photo to get started</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => requireAuth(() => cameraRef.current?.click())}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
                    >
                      <Camera className="h-4 w-4" /> Open camera
                    </button>
                    <button
                      type="button"
                      onClick={() => requireAuth(() => browseRef.current?.click())}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-bold text-emerald-800 hover:bg-emerald-50"
                    >
                      <UploadCloud className="h-4 w-4" /> Browse files
                    </button>
                  </div>
                </div>
              )}
              {uploading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                  <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
                </div>
              ) : null}
            </div>

            <input ref={browseRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFile}
            />

            <textarea
              rows={3}
              value={uploadForm.caption}
              onChange={(event) => setUploadForm((prev) => ({ ...prev, caption: event.target.value }))}
              placeholder="Caption your snap — species, location, or the story behind it..."
              className="w-full rounded-2xl border border-emerald-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
            />

            <button
              type="submit"
              disabled={submitting || uploading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {isSignedIn ? "Publish my snap" : "Upload — continue with Google"}
            </button>

            {!isSignedIn ? (
              <p className="text-center text-xs text-gray-500">
                You&apos;ll sign in with Google. No OTP codes — your device stays signed in next time.
              </p>
            ) : null}
          </form>
        </section>

        <div className="space-y-6">
          <NotifyForm
            title="Never miss a winner"
            description="Add your email for notifications. You are added to the member directory and receive every broadcast."
          />
          <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-emerald-900">
              <Users className="h-4 w-4" /> How it works
            </h3>
            <ol className="mt-3 space-y-2 text-sm text-gray-600">
              <li>1. Snap with your camera or upload a photo.</li>
              <li>2. Post it — the whole club is notified by email and in-app.</li>
              <li>3. The executive picks 3 winners each week for the Hall of Fame.</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Community feed */}
      <section className="mt-12">
        <h2 className="text-2xl font-black text-emerald-950">All nature snaps</h2>
        <p className="text-sm text-gray-500">Every official feature and member upload, newest first.</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {community.map((snap) => (
            <article key={snap._id} className="group overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-emerald-100">
              <button type="button" onClick={() => setPreview(snap)} className="block w-full text-left">
                <div className="relative aspect-square overflow-hidden">
                  <img
                    src={optimizedImage(snap.imageUrl, 700)}
                    alt={snap.caption || "Member nature snap"}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-4">
                  <p className="text-sm font-bold text-emerald-950">
                    {snap.fullName || "DEKUWEC member"}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-600">{snap.caption || "No caption"}</p>
                  <div className="mt-3 flex items-center gap-4 text-xs font-bold text-gray-500">
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="h-3.5 w-3.5 text-emerald-600" /> {snap.likes?.length || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <ThumbsDown className="h-3.5 w-3.5 text-rose-500" /> {snap.dislikes?.length || 0}
                    </span>
                  </div>
                </div>
              </button>
              <div className="px-4 pb-4">
                <button
                  type="button"
                  onClick={() => shareSnap(snap)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  {copiedId === snap._id ? "Link copied" : "Share"}
                </button>
              </div>
            </article>
          ))}
          {!loading && community.length === 0 ? (
            <div className="sm:col-span-2 lg:col-span-3 rounded-3xl border border-dashed border-emerald-200 bg-white p-10 text-center">
              <Camera className="mx-auto h-10 w-10 text-emerald-300" />
              <p className="mt-3 text-sm font-semibold text-gray-500">No member snaps yet. Be the first!</p>
            </div>
          ) : null}
        </div>
      </section>

      {/* Official gallery */}
      {gallery.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-2xl font-black text-emerald-950">Official gallery</h2>
          <p className="text-sm text-gray-500">Published features from past weeks.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gallery.map((snap) => (
              <button
                key={snap._id}
                type="button"
                onClick={() => setPreview(snap)}
                className="group overflow-hidden rounded-3xl bg-white text-left shadow-sm ring-1 ring-emerald-100"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={optimizedImage(snap.imageUrl, 700)}
                    alt={snap.title || "Official nature snap"}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-emerald-900/80 px-2.5 py-1 text-[11px] font-bold text-white">
                    {typeLabel(snap.type)}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="truncate text-sm font-black text-emerald-950">{snap.title || "Nature capture"}</h3>
                  <p className="text-xs text-gray-500">{snap.photographer || "DEKUWEC"}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* Preview modal */}
      {preview ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 p-4">
              <p className="text-sm font-black text-emerald-950">
                {preview.title || preview.caption || "Nature snap"}
              </p>
              <button type="button" onClick={() => setPreview(null)} className="rounded-full p-2 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <img src={optimizedImage(preview.imageUrl, 1600)} alt={preview.caption || "Nature snap"} className="w-full object-contain" />
            <div className="space-y-3 p-5">
              <p className="text-sm text-gray-700">{preview.caption || preview.description || "No caption"}</p>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                {preview.photographer || preview.fullName || "DEKUWEC member"}
              </p>
              <button
                type="button"
                onClick={() => shareSnap(preview)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
              >
                <Share2 className="h-4 w-4" /> {copiedId === preview._id ? "Link copied" : "Share this snap"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Google sign-in gate */}
      {showAuth ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowAuth(false)}>
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <Camera className="h-7 w-7 text-emerald-700" />
            </div>
            <h3 className="mt-4 text-xl font-black text-emerald-950">Continue with Google</h3>
            <p className="mt-2 text-sm text-gray-500">
              Create your DEKUWEC account in one tap to upload your nature snap. No OTP codes, and this device
              stays signed in next time.
            </p>
            <div className="mt-5 flex justify-center">
              <GoogleContinueButton />
            </div>
            <button
              type="button"
              onClick={() => setShowAuth(false)}
              className="mt-4 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-gray-600"
            >
              Not now
            </button>
          </div>
        </div>
      ) : null}
    </PublicPageShell>
  );
}
