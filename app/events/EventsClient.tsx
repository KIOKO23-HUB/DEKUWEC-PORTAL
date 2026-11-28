"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Clapperboard, Heart, MessageCircle, Share2 } from "lucide-react";
import { optimizedImage } from "@/lib/image";
import { uploadImage } from "@/lib/clientUpload";
import { renderPoster, type PosterTemplate } from "@/lib/poster";
import ReelsFeed, { type ReelItem } from "@/components/media/ReelsFeed";
import { eventToReels, snapToReel, type SnapSource } from "@/lib/reels";

type Tier = { id: string; label: string; amount: number };

type PublicEvent = {
  _id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  imageUrl: string;
  description: string;
  isFree: boolean;
  tiers: Tier[];
  posterTemplate?: PosterTemplate | null;
  media?: { url?: string; type?: string; kind?: string }[];
  likes?: string[];
  reposts?: string[];
  comments?: { clerkId: string; fullName: string; text: string; createdAt?: string }[];
  reels?: SnapSource[];
};

type Step = "idle" | "details" | "paying" | "success";

type Registration = {
  registrationId: string;
  clerkId: string;
  amount: number;
  tierLabel: string;
  reference: string;
};

const CLUB_EMAIL = "wildlifeandenvironmentalclub@dkut.ac.ke";

function PosterStudio({
  template,
  defaultName,
  registrationId,
  clerkId,
}: {
  template: PosterTemplate;
  defaultName: string;
  registrationId?: string;
  clerkId?: string;
}) {
  const [name, setName] = useState(defaultName);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const build = async (file: File, finalName: string) => {
    setBusy(true);
    setError("");
    try {
      const { blob, dataUrl } = await renderPoster(template, file, finalName);
      setPreview(dataUrl);

      if (registrationId) {
        try {
          const [photoUrl, posterUrl] = await Promise.all([
            uploadImage(file),
            uploadImage(new File([blob], "event-poster.jpg", { type: "image/jpeg" })),
          ]);
          const res = await fetch("/api/public/events/poster", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ registrationId, clerkId, posterPhotoUrl: photoUrl, posterImageUrl: posterUrl }),
          });
          if (!res.ok) {
            setError("Your poster is ready, but we couldn't save a copy. You can still download it.");
          }
        } catch {
          setError("Your poster is ready, but we couldn't save a copy. You can still download it.");
        }
      }
    } catch {
      setError("We couldn't build your poster. Please try another photo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-emerald-200 bg-white p-4 text-slate-900">
      <p className="text-sm font-bold text-emerald-900">Get your personalised event poster 🖼️</p>
      <p className="mt-1 text-xs text-slate-600">
        Upload a clear passport photo. We&apos;ll place it on the event poster with your name — great for sharing.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs">
          <span className="mb-1 block font-semibold text-slate-700">Your name on the poster</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500" />
        </label>
        <label className="block text-xs">
          <span className="mb-1 block font-semibold text-slate-700">Passport photo</span>
          <input
            type="file"
            accept="image/*"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setPhoto(file);
              void build(file, name);
            }}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs file:mr-3 file:rounded-full file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-emerald-700 disabled:opacity-50"
          />
        </label>
      </div>

      {busy && <p className="mt-3 text-xs font-semibold text-emerald-700">Creating your poster…</p>}
      {error && <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{error}</p>}

      {preview && (
        <div className="mt-4 space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Your personalised event poster" className="w-full rounded-xl border border-slate-200" />
          <div className="flex flex-wrap gap-2">
            <a
              href={preview}
              download={`${(name || "dekuwec").replace(/\s+/g, "-")}-event-poster.jpg`}
              className="rounded-xl bg-emerald-900 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800"
            >
              Download poster
            </a>
            {photo && (
              <button
                type="button"
                onClick={() => void build(photo, name)}
                disabled={busy}
                className="rounded-xl border border-emerald-200 px-4 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
              >
                Update name on poster
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EventCard({ event }: { event: PublicEvent }) {
  const { user, isSignedIn } = useUser();
  const [step, setStep] = useState<Step>("idle");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };
  useEffect(() => stopPolling, []);
  const [form, setForm] = useState({ fullName: "", regNo: "", email: "", phone: "", tierId: event.tiers[0]?.id || "" });
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [payPhone, setPayPhone] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [polling, setPolling] = useState(false);
  const [payPhase, setPayPhase] = useState<"idle" | "sent" | "confirmed" | "failed">("idle");
  const [receipt, setReceipt] = useState("");
  const [likes, setLikes] = useState<string[]>(event.likes || []);
  const [comments, setComments] = useState(event.comments || []);
  const [comment, setComment] = useState("");
  const [interactionBusy, setInteractionBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const tier = event.tiers.find((item) => item.id === form.tierId) || event.tiers[0];
  const liked = !!user && likes.includes(user.id);

  const toggleLike = async () => {
    if (!isSignedIn || !user) {
      window.location.href = `/login?redirect_url=${encodeURIComponent(`/events?event=${event._id}`)}`;
      return;
    }
    setInteractionBusy(true);
    try {
      const res = await fetch("/api/events/interact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event._id,
          clerkId: user.id,
          action: liked ? "unlike" : "like",
        }),
      });
      const data = await res.json();
      if (res.ok) setLikes(data.event?.likes || []);
    } finally {
      setInteractionBusy(false);
    }
  };

  const postComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignedIn || !user) {
      window.location.href = `/login?redirect_url=${encodeURIComponent(`/events?event=${event._id}`)}`;
      return;
    }
    const text = comment.trim();
    if (!text) return;
    setInteractionBusy(true);
    try {
      const res = await fetch("/api/events/interact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event._id,
          clerkId: user.id,
          action: "comment",
          commentData: {
            clerkId: user.id,
            fullName: user.fullName || user.username || "DEKUWEC member",
            text,
          },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setComments(data.event?.comments || []);
        setComment("");
      }
    } finally {
      setInteractionBusy(false);
    }
  };

  const shareEvent = async () => {
    const url = `${window.location.origin}/events?event=${event._id}`;
    const text = `${event.title} | Upcoming event on DEKUWEC`;
    try {
      if (navigator.share) {
        await navigator.share({ title: event.title, text, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // User dismissed the native share sheet.
    }
  };

  const update = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/public/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, eventId: event._id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Could not register. Please try again.");
        return;
      }
      setRegistration(data);
      setPayPhone(form.phone);
      if (data.isFree) {
        setStep("success");
        setNotice("Your free slot is confirmed. See you there!");
      } else {
        setStep("paying");
        setNotice(`Registration saved. Pay KES ${data.amount} to confirm your slot.`);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registration) return;
    setError("");
    setBusy(true);
    setPolling(false);
    setPayPhase("idle");
    setStep("paying");

    try {
      const pushRes = await fetch("/api/mpesa/stkpush", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: registration.clerkId,
          fullName: form.fullName,
          phone: payPhone.replace(/[^\d+]/g, ""),
          amount: registration.amount,
          totalDue: registration.amount,
          category: "Event Registration",
          reference: registration.reference,
          targetId: registration.registrationId,
        }),
      });
      const pushData = await pushRes.json();
      if (!pushRes.ok) {
        setError(pushData?.error || "M-Pesa request failed. Try again.");
        return;
      }

      setNotice("Prompt sent. Enter your M-Pesa PIN on your phone now.");
      setPayPhase("sent");
      setBusy(false);
      setPolling(true);
      let attempts = 0;
      stopPolling();
      // Faster poll loop (1.5s) so the confirmation lands while the member is
      // still looking at their phone instead of waiting on a 30s refresh.
      pollRef.current = setInterval(async () => {
        attempts += 1;
        try {
          const statusRes = await fetch(`/api/mpesa/status?id=${pushData.paymentId}`, { cache: "no-store" });
          const statusData = await statusRes.json();
          if (statusData.status === "Completed") {
            stopPolling();
            setPolling(false);
            setPayPhase("confirmed");
            setReceipt(statusData.receipt || "");
            setNotice("");
            setStep("success");
          } else if (statusData.status === "Failed" || attempts >= 40) {
            stopPolling();
            setPolling(false);
            setPayPhase("failed");
            setError(
              statusData.status === "Failed"
                ? "Payment failed. Please check your balance and try again."
                : "Payment is taking too long. If you were charged, contact the club with your receipt."
            );
          }
        } catch {
          /* keep polling */
        }
      }, 1500);
    } catch {
      setError("Server connection failed. Please try again.");
      setBusy(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";

  return (
    <article id={`event-${event._id}`} className="scroll-mt-24 mx-auto max-w-[520px] rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-300/40">
      {event.imageUrl && (
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-t-[2rem] bg-slate-950">
          <img
            src={optimizedImage(event.imageUrl, 1000)}
            alt={`${event.title} poster`}
            className="block h-full w-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/55 to-transparent px-5 pb-5 pt-24 text-white">
            <span className="inline-flex rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]">
              {event.isFree ? "Free event" : "Registration open"}
            </span>
            <h2 className="mt-2 text-xl font-black leading-tight sm:text-2xl">{event.title}</h2>
            <p className="mt-1 text-sm text-white/85">{event.date}{event.location ? ` · ${event.location}` : ""}</p>
          </div>
          <div className="absolute bottom-24 right-3 flex flex-col gap-2">
            <button
              type="button"
              onClick={toggleLike}
              disabled={interactionBusy}
              className={`flex h-12 w-12 flex-col items-center justify-center rounded-full shadow-lg backdrop-blur ${
                liked ? "bg-rose-500 text-white" : "bg-black/55 text-white"
              }`}
              aria-label="Like event"
            >
              <Heart className={`h-5 w-5 ${liked ? "fill-current" : ""}`} />
              <span className="text-[10px] font-black">{likes.length}</span>
            </button>
            <button
              type="button"
              onClick={() => document.getElementById(`event-comment-${event._id}`)?.focus()}
              className="flex h-12 w-12 flex-col items-center justify-center rounded-full bg-black/55 text-white shadow-lg backdrop-blur"
              aria-label="View comments"
            >
              <MessageCircle className="h-5 w-5" />
              <span className="text-[10px] font-black">{comments.length}</span>
            </button>
            <button
              type="button"
              onClick={shareEvent}
              className="flex h-12 w-12 flex-col items-center justify-center rounded-full bg-black/55 text-white shadow-lg backdrop-blur"
              aria-label="Share event"
            >
              <Share2 className="h-5 w-5" />
              <span className="text-[9px] font-black">{copied ? "Copied" : "Share"}</span>
            </button>
          </div>
        </div>
      )}

      <div className="space-y-5 p-5 sm:p-8">
        <div>
          <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-800">
            {event.isFree ? "Free event" : "Registration open"}
          </span>
          <h2 className="mt-3 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">{event.title}</h2>
          <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
            <p>🗓️ {event.date}</p>
            {event.time && <p>⏰ {event.time}</p>}
            {event.location && <p>📍 {event.location}</p>}
            {!event.isFree && event.tiers[0] && <p>🎟️ From KES {event.tiers[0].amount}</p>}
          </div>
          {event.description && (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{event.description}</p>
          )}
        </div>

        <div className="border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleLike}
              disabled={interactionBusy}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
                liked ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
              {likes.length}
            </button>
            <button
              type="button"
              onClick={() => document.getElementById(`event-comment-${event._id}`)?.focus()}
              className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
            >
              <MessageCircle className="h-4 w-4" />
              {comments.length}
            </button>
            <button
              type="button"
              onClick={shareEvent}
              className="ml-auto inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-100"
            >
              <Share2 className="h-4 w-4" />
              {copied ? "Link copied" : "Share"}
            </button>
          </div>

          {comments.length > 0 && (
            <div className="mt-4 max-h-36 space-y-2 overflow-y-auto">
              {comments.slice(-5).reverse().map((item, index) => (
                <div key={`${item.clerkId}-${item.createdAt || index}`} className="rounded-xl bg-slate-50 px-3 py-2">
                  <p className="text-xs font-bold text-slate-800">{item.fullName}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{item.text}</p>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={postComment} className="mt-3 flex gap-2">
            <input
              id={`event-comment-${event._id}`}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment..."
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={interactionBusy || !comment.trim()}
              className="rounded-xl bg-emerald-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              Post
            </button>
          </form>
        </div>

        {step === "idle" && (
          <div className="sticky bottom-0 z-20 -mx-5 -mb-5 border-t border-slate-100 bg-white/95 px-5 py-3 backdrop-blur sm:static sm:mx-0 sm:mb-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
            <button
              onClick={() => setStep("details")}
              className="w-full rounded-xl bg-emerald-900 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-800 sm:w-auto"
            >
              Register {event.isFree ? "" : "& Pay"}
            </button>
          </div>
        )}

        {step === "details" && (
          <form onSubmit={submitDetails} className="space-y-4 border-t border-slate-100 pt-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1.5 block font-semibold text-slate-700">Full name *</span>
                <input required value={form.fullName} onChange={(e) => update("fullName", e.target.value)} className={inputClass} placeholder="Jane Wanjiku" />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-semibold text-slate-700">Reg. number *</span>
                <input required value={form.regNo} onChange={(e) => update("regNo", e.target.value)} className={inputClass} placeholder="S21/01234/22" />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-semibold text-slate-700">Email *</span>
                <input required type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className={inputClass} placeholder="you@student.dkut.ac.ke" />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-semibold text-slate-700">M-Pesa phone *</span>
                <input required value={form.phone} onChange={(e) => update("phone", e.target.value)} className={inputClass} placeholder="0712345678" />
              </label>
            </div>

            {!event.isFree && event.tiers.length > 0 && (
              <label className="block text-sm">
                <span className="mb-1.5 block font-semibold text-slate-700">Ticket type *</span>
                <select value={form.tierId} onChange={(e) => update("tierId", e.target.value)} className={inputClass}>
                  {event.tiers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label} — KES {item.amount}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-emerald-900 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {busy ? "Saving…" : event.isFree ? "Confirm registration" : `Continue — KES ${tier?.amount ?? 0}`}
              </button>
              <button type="button" onClick={() => setStep("idle")} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </form>
        )}

        {step === "paying" && registration && !registration.amount && (
          <p className="text-sm text-slate-500">Preparing checkout…</p>
        )}

        {step === "paying" && registration && registration.amount > 0 && (
          <form onSubmit={pay} className="space-y-4 border-t border-slate-100 pt-5">
            <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-lime-50 p-4 text-sm text-slate-600 ring-1 ring-emerald-100">
              <p className="flex items-center justify-between">
                <strong className="text-slate-900">{registration.tierLabel}</strong>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-emerald-800">
                  KES {registration.amount}
                </span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                The prompt usually lands in under 10 seconds. Keep this page open while it confirms.
              </p>
            </div>

            <label className="block text-sm">
              <span className="mb-1.5 block font-semibold text-slate-700">M-Pesa number</span>
              <input
                required
                inputMode="tel"
                autoComplete="tel"
                value={payPhone}
                onChange={(e) => setPayPhone(e.target.value)}
                className={inputClass}
                placeholder="0712345678"
              />
            </label>

            <ol className="space-y-2 rounded-2xl bg-white p-3 ring-1 ring-slate-100">
              {[
                { key: "sent", label: "Prompt sent to your phone" },
                { key: "pin", label: "Enter your M-Pesa PIN" },
                { key: "confirmed", label: "Payment confirmed" },
              ].map((item, index) => {
                const done =
                  (item.key === "sent" && (payPhase === "sent" || payPhase === "confirmed")) ||
                  (item.key === "confirmed" && payPhase === "confirmed");
                const active =
                  (item.key === "pin" && payPhase === "sent") ||
                  (item.key === "sent" && payPhase === "idle" && busy);
                return (
                  <li key={item.key} className="flex items-center gap-2.5 text-xs">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black transition ${
                        done
                          ? "bg-emerald-600 text-white"
                          : active
                            ? "bg-amber-400 text-amber-950 animate-pulse-ring"
                            : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {done ? "✓" : index + 1}
                    </span>
                    <span className={done ? "font-bold text-emerald-800" : "font-medium text-slate-600"}>
                      {item.label}
                    </span>
                  </li>
                );
              })}
            </ol>

            {notice && (
              <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {notice}
              </p>
            )}
            {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            <button
              type="submit"
              disabled={busy || polling}
              className="w-full rounded-xl bg-emerald-900 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-60 sm:w-auto"
            >
              {busy
                ? "Sending prompt…"
                : polling
                  ? "Waiting for confirmation…"
                  : payPhase === "failed"
                    ? `Retry KES ${registration.amount} payment`
                    : `Pay KES ${registration.amount} with M-Pesa`}
            </button>
          </form>
        )}

        {step === "success" && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
            <p className="text-base font-bold">You&apos;re registered 🎉</p>
            <p className="mt-1">{notice || "Payment confirmed. A receipt has been sent to your email."}</p>
            {receipt && <p className="mt-1 font-semibold">M-Pesa receipt: {receipt}</p>}
            <p className="mt-2 text-xs text-emerald-800/80">
              Need help? Email {CLUB_EMAIL}
            </p>
          </div>
        )}

        {registration && event.posterTemplate && (
          <PosterStudio
            template={event.posterTemplate}
            defaultName={form.fullName}
            registrationId={registration.registrationId}
            clerkId={registration.clerkId}
          />
        )}
      </div>
    </article>
  );
}

export default function EventsClient() {
  const { user } = useUser();
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shareNote, setShareNote] = useState("");

  const moments = useMemo<ReelItem[]>(
    () =>
      events
        .flatMap((event) => {
          const official = eventToReels({
            _id: event._id,
            title: event.title,
            description: event.description,
            imageUrl: event.imageUrl,
            date: event.date,
            location: event.location,
            likes: event.likes,
            reposts: event.reposts,
            media: event.media,
          });
          const memberReels = (event.reels || [])
            .map((reel) => snapToReel(reel, false))
            .filter(Boolean) as ReelItem[];
          return [...memberReels, ...official];
        })
        .slice(0, 12),
    [events]
  );

  const reactToEvent = (item: ReelItem, action: string, commentData?: { fullName: string; text: string }) => {
    if (!user) {
      window.location.href = `/login?redirect_url=${encodeURIComponent("/events")}`;
      return Promise.resolve();
    }
    const eventId = item.id.split("-")[0];
    return fetch("/api/events/interact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        clerkId: user?.id,
        action,
        commentData: commentData
          ? { ...commentData, fullName: commentData.fullName || user?.fullName || "DEKUWEC member" }
          : undefined,
      }),
    }).catch(() => {});
  };

  useEffect(() => {
    const eventId = new URLSearchParams(window.location.search).get("event");
    const url = eventId ? `/api/public/events?id=${encodeURIComponent(eventId)}` : "/api/public/events";
    fetch(url, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data?.error) setError(data.error);
        else {
          setEvents(data.events || []);
          if (eventId) {
            setTimeout(() => document.getElementById(`event-${eventId}`)?.scrollIntoView({ block: "start" }), 300);
          }
        }
      })
      .catch(() => setError("Unable to load events right now."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-emerald-900/20 bg-emerald-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-5 py-3">
          <span className="text-sm font-black tracking-tight text-white">DEKUWEC Events</span>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/10"
            >
              Portal
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-emerald-900 transition hover:bg-emerald-50"
            >
              ← Main Site
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-800">
            <Clapperboard className="h-3.5 w-3.5" /> Event reels &amp; stories
          </span>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-emerald-950 sm:text-3xl">
            Upcoming Events
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Swipe the stories, then register and pay via M-Pesa in under a minute. No portal account needed.
          </p>
        </div>

        {moments.length > 0 ? (
          <section className="mb-9 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-emerald-100 sm:p-5">
            <ReelsFeed
              items={moments}
              currentUserId={user?.id}
              storiesTitle="Event stories"
              layout="feed"
              onLike={(item, liked) => {
                reactToEvent(item, liked ? "like" : "unlike");
              }}
              onRepost={(item) => {
                const already = !!user && (item.reposts || []).includes(user.id);
                reactToEvent(item, already ? "unrepost" : "repost");
              }}
              onComment={(item, text) =>
                reactToEvent(item, "comment", {
                  fullName: user?.fullName || "DEKUWEC member",
                  text,
                }).then(() => undefined)
              }
              onShare={() => setShareNote("Link copied — share this event with your friends.")}
            />
            {shareNote ? (
              <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                {shareNote}
              </p>
            ) : null}
          </section>
        ) : null}

        {error && (
          <p className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        {loading ? (
          <div className="space-y-6">
            <div className="h-64 animate-pulse rounded-3xl bg-slate-200/60" />
            <div className="h-40 animate-pulse rounded-3xl bg-slate-200/60" />
          </div>
        ) : events.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-sm text-slate-500">
            No upcoming events have been posted yet. Check back soon.
          </p>
        ) : (
          <div className="mx-auto max-w-[560px] space-y-6 pb-16">
            {events.map((event) => (
              <div key={event._id} className="scroll-mt-24">
                <EventCard event={event} />
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 px-5 py-8 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Dedan Kimathi Wildlife &amp; Environmental Club</p>
          <div className="flex items-center gap-4">
            <a className="font-semibold text-emerald-700 hover:text-emerald-800" href={`mailto:${CLUB_EMAIL}`}>
              {CLUB_EMAIL}
            </a>
            <Link className="font-semibold text-emerald-700 hover:text-emerald-800" href="/">
              Main site →
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
