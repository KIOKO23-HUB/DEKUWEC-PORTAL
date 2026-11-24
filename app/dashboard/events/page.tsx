"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import {
  ArrowRight,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  Image as ImageIcon,
  Leaf,
  Loader2,
  MapPin,
  MessageSquare,
  Send,
  Smartphone,
  Sparkles,
  Ticket,
  Users,
  X,
} from "lucide-react";
import ReelsFeed, { type ReelItem } from "@/components/media/ReelsFeed";
import { eventToReels } from "@/lib/reels";
import { optimizedImage } from "@/lib/image";

type Tier = { id: string; label: string; amount: number };

type EventLite = {
  _id: string;
  title: string;
  description: string;
  date: string;
  time?: string;
  location?: string;
  imageUrl?: string;
  media?: { url?: string; type?: string; kind?: string }[];
  galleryLink?: string;
  category?: string;
  isFree?: boolean;
  likes?: string[];
  reposts?: string[];
  comments?: { clerkId: string; fullName: string; text: string; createdAt?: string }[];
};

type Step = "form" | "ask_pay" | "checkout" | "polling" | "success";

function EventReactions({
  event,
  userId,
  userName,
}: {
  event: EventLite;
  userId?: string;
  userName?: string;
}) {
  const [likes, setLikes] = useState<string[]>(event.likes || []);
  const [comments, setComments] = useState(event.comments || []);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const liked = !!userId && likes.includes(userId);

  const interact = async (action: string, commentData?: { fullName: string; text: string }) => {
    if (!userId) return;
    await fetch("/api/events/interact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: event._id, clerkId: userId, action, commentData }),
    });
  };

  const toggleLike = () => {
    if (!userId) return;
    setLikes((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    );
    interact(liked ? "unlike" : "like");
  };

  const submit = async (formEvent: React.FormEvent) => {
    formEvent.preventDefault();
    const text = draft.trim();
    if (!text || !userId) return;
    setBusy(true);
    const name = userName || "DEKUWEC member";
    const optimistic = {
      clerkId: userId,
      fullName: name,
      text,
      createdAt: new Date().toISOString(),
    };
    setComments((current) => [...current, optimistic]);
    setDraft("");
    try {
      await interact("comment", { fullName: name, text });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-t border-emerald-50 pt-3">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={toggleLike}
          className={`inline-flex items-center gap-1.5 text-xs font-bold transition ${
            liked ? "text-rose-600" : "text-slate-500 hover:text-rose-600"
          }`}
        >
          <span className="text-base leading-none">♥</span>
          {likes.length} {likes.length === 1 ? "like" : "likes"}
        </button>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition hover:text-emerald-700"
        >
          <MessageSquare className="h-4 w-4" />
          {comments.length} comments
        </button>
      </div>

      {open ? (
        <div className="mt-3 space-y-2">
          <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
            {comments.length === 0 ? (
              <p className="py-2 text-center text-xs italic text-slate-400">No comments yet.</p>
            ) : (
              comments.map((entry, index) => (
                <div key={`${entry.clerkId}-${index}`} className="rounded-xl bg-emerald-50/60 px-3 py-2">
                  <p className="text-[11px] font-bold text-emerald-900">{entry.fullName}</p>
                  <p className="text-xs leading-snug text-slate-600">{entry.text}</p>
                </div>
              ))
            )}
          </div>
          <form onSubmit={submit} className="flex gap-2">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Write a comment…"
              maxLength={280}
              className="min-w-0 flex-1 rounded-full border border-emerald-100 bg-white px-3.5 py-2 text-xs outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={!draft.trim() || busy}
              className="rounded-full bg-emerald-700 p-2 text-white transition hover:bg-emerald-800 disabled:opacity-40"
              aria-label="Post comment"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export default function DashboardEventsPage() {
  const { user, isLoaded } = useUser();
  const [events, setEvents] = useState<EventLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [rsvpStatus, setRsvpStatus] = useState<Record<string, string>>({});
  const [shareNote, setShareNote] = useState("");

  const [activeEvent, setActiveEvent] = useState<EventLite | null>(null);
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState({ name: "", regNo: "", phone: "" });
  const [paymentPhone, setPaymentPhone] = useState("");
  const [tiers, setTiers] = useState<Tier[]>([
    { id: "member", label: "Registered club member", amount: 650 },
    { id: "first_year", label: "First year student", amount: 650 },
    { id: "non_member", label: "Non-member / associate", amount: 750 },
  ]);
  const [selectedTier, setSelectedTier] = useState("member");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [receiptBalance, setReceiptBalance] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };
  useEffect(() => stopPolling, []);

  useEffect(() => {
    async function load() {
      try {
        const [eventsRes, feesRes, activityRes] = await Promise.all([
          fetch("/api/admin/events", { cache: "no-store" }).catch(() => null),
          fetch("/api/admin/fees", { cache: "no-store" }).catch(() => null),
          user
            ? fetch(`/api/account/activity?clerkId=${user.id}`, { cache: "no-store" }).catch(() => null)
            : Promise.resolve(null),
        ]);

        if (eventsRes?.ok) {
          const data = await eventsRes.json();
          setEvents(Array.isArray(data.events) ? data.events : []);
        }

        if (activityRes?.ok) {
          const activity = await activityRes.json();
          const map: Record<string, string> = {};
          (activity.rsvps || []).forEach((rsvp: any) => {
            map[rsvp.eventName] = rsvp.paymentStatus || "Not Yet Paid";
          });
          setRsvpStatus(map);
        }

        if (feesRes?.ok) {
          const fees = await feesRes.json();
          if (Array.isArray(fees.eventTiers) && fees.eventTiers.length) {
            setTiers(fees.eventTiers);
            setSelectedTier(fees.eventTiers[0].id);
          } else if (fees.eventMember) {
            const legacy: Tier[] = [
              { id: "member", label: "Registered club member", amount: fees.eventMember },
              { id: "first_year", label: "First year student", amount: fees.eventMember },
              {
                id: "non_member",
                label: "Non-member / associate",
                amount: fees.eventNonMember || fees.eventMember,
              },
            ];
            setTiers(legacy);
            setSelectedTier(legacy[0].id);
          }
        }
      } catch (loadError) {
        console.error("Failed to load events:", loadError);
      } finally {
        setLoading(false);
      }
    }
    if (!isLoaded) return;
    load();
  }, [user, isLoaded]);

  useEffect(() => {
    if (user?.fullName) {
      setForm((previous) => ({ ...previous, name: previous.name || user.fullName || "" }));
    }
  }, [user]);

  const selectedAmount = tiers.find((tier) => tier.id === selectedTier)?.amount ?? tiers[0]?.amount ?? 0;

  const upcoming = useMemo(() => events.filter((event) => event.category === "upcoming"), [events]);
  const previous = useMemo(() => events.filter((event) => event.category === "previous"), [events]);
  const projects = useMemo(() => events.filter((event) => event.category === "project"), [events]);

  const moments = useMemo<ReelItem[]>(
    () => events.flatMap((event) => eventToReels(event)).slice(0, 12),
    [events]
  );

  const reactToEvent = (item: ReelItem, action: string, commentData?: { fullName: string; text: string }) => {
    if (!user) return Promise.resolve();
    const eventId = item.id.split("-")[0];
    return fetch("/api/events/interact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, clerkId: user.id, action, commentData }),
    }).catch(() => {});
  };

  const openModal = (event: EventLite) => {
    setActiveEvent(event);
    setStep("form");
    setError("");
    setNotice("");
    setReceiptBalance(null);
  };

  const closeModal = () => {
    stopPolling();
    setActiveEvent(null);
    setStep("form");
    setBusy(false);
  };

  const continueToPayment = (event: EventLite) => {
    setActiveEvent(event);
    setStep("checkout");
    setError("");
    setNotice("");
    setPaymentPhone(form.phone);
  };

  const submitRegistration = async (submitEvent: React.FormEvent) => {
    submitEvent.preventDefault();
    if (!activeEvent || !user) return;
    setBusy(true);
    setError("");

    try {
      const res = await fetch("/api/admin/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: user.id,
          fullName: form.name,
          phone: form.phone,
          phoneNumber: form.phone,
          registrationNumber: form.regNo,
          email: user.primaryEmailAddress?.emailAddress || "",
          eventName: activeEvent.title,
          paymentStatus: activeEvent.isFree ? "Paid" : "Not Yet Paid",
          amountPaid: 0,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not submit your application. Please try again.");
        return;
      }

      setPaymentPhone(form.phone);

      if (activeEvent.isFree) {
        setRsvpStatus((current) => ({ ...current, [activeEvent.title]: "Paid" }));
        setStep("success");
        setNotice("Your free slot is confirmed. See you there!");
      } else {
        setRsvpStatus((current) => ({ ...current, [activeEvent.title]: "Not Yet Paid" }));
        setStep("ask_pay");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const initiatePayment = async (submitEvent: React.FormEvent) => {
    submitEvent.preventDefault();
    if (!activeEvent) return;
    if (!paymentPhone.trim()) {
      setError("Enter the M-Pesa number that will receive the prompt.");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    setStep("polling");
    stopPolling();

    try {
      const pushRes = await fetch("/api/mpesa/stkpush", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: user?.id,
          fullName: user?.fullName || form.name || "Member",
          phone: paymentPhone.replace(/[^\d+]/g, ""),
          amount: selectedAmount,
          totalDue: selectedAmount,
          category: "Event Registration",
          reference: activeEvent.title,
        }),
      });
      const pushData = await pushRes.json();

      if (!pushRes.ok) {
        setError(pushData.error || "M-Pesa rejected the request. Please try again.");
        setStep("checkout");
        setBusy(false);
        return;
      }

      setBusy(false);
      setNotice("Prompt sent. Enter your M-Pesa PIN on your phone now.");

      let attempts = 0;
      pollRef.current = setInterval(async () => {
        attempts += 1;
        try {
          const statusRes = await fetch(`/api/mpesa/status?id=${pushData.paymentId}`, { cache: "no-store" });
          const statusData = await statusRes.json();

          if (statusData.status === "Completed") {
            stopPolling();
            setReceiptBalance(statusData.balance ?? 0);
            setRsvpStatus((current) => ({ ...current, [activeEvent.title]: "Paid" }));
            setNotice("");
            setStep("success");
            window.setTimeout(() => closeModal(), 3500);
          } else if (statusData.status === "Failed" || attempts >= 40) {
            stopPolling();
            setError(
              statusData.status === "Failed"
                ? "Payment failed. Check your balance and try again."
                : "Payment is taking too long. If you were charged, share your receipt with the club."
            );
            setStep("checkout");
          }
        } catch {
          /* keep polling */
        }
      }, 1500);
    } catch {
      setError("Server connection failed. Please try again.");
      setStep("checkout");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-7 lg:p-9">
      <header className="animate-rise flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
            Events &amp; activities
          </p>
          <h1 className="mt-1 text-2xl font-black text-emerald-950 sm:text-3xl">Where the club goes next</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Watch the moments, reserve a slot, and pay with M-Pesa without leaving the portal.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
            <Calendar className="h-3.5 w-3.5" /> {upcoming.length} upcoming
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
            <Camera className="h-3.5 w-3.5" /> {moments.length} moments
          </span>
          <Link
            href="/events"
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-900 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-emerald-800"
          >
            Public page <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="space-y-5">
          <div className="skeleton h-24 rounded-3xl" />
          <div className="skeleton h-64 rounded-3xl" />
        </div>
      ) : (
        <>
          {moments.length > 0 ? (
            <section className="card p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-black text-emerald-950">
                  <Sparkles className="h-4 w-4 text-emerald-600" /> Club moments
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                  Tap to watch · like · comment
                </span>
              </div>
              <ReelsFeed
                items={moments}
                currentUserId={user?.id}
                storiesTitle="Event stories"
                layout="grid"
                onLike={(item, liked) => {
                  reactToEvent(item, liked ? "like" : "unlike");
                }}
                onRepost={(item) => {
                  const already = !!user && (item.reposts || []).includes(user.id);
                  reactToEvent(item, already ? "unrepost" : "repost");
                }}
                onComment={(item, text) =>
                  reactToEvent(item, "comment", {
                    fullName: user?.fullName || "Member",
                    text,
                  }).then(() => undefined)
                }
                onShare={() => setShareNote("Link copied — share this event with a friend.")}
              />
              {shareNote ? (
                <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                  {shareNote}
                </p>
              ) : null}
            </section>
          ) : null}

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Calendar className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-black text-emerald-950">Upcoming events</h2>
            </div>

            {upcoming.length === 0 ? (
              <div className="card border-dashed p-10 text-center">
                <Calendar className="mx-auto h-9 w-9 text-emerald-300" />
                <p className="mt-3 text-sm font-semibold text-slate-500">
                  Nothing scheduled yet. Watch this space.
                </p>
              </div>
            ) : (
              <div className="grid gap-5">
                {upcoming.map((event) => {
                  const status = rsvpStatus[event.title];
                  const paid = status === "Paid";
                  const pending = status === "Not Yet Paid";
                  return (
                    <article key={event._id} className="card card-hover overflow-hidden">
                      <div className="grid md:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
                        <div className="relative h-56 md:h-full">
                          {event.imageUrl ? (
                            <img
                              src={optimizedImage(event.imageUrl, 900)}
                              alt={`${event.title} poster`}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-emerald-950">
                              <Calendar className="h-10 w-10 text-emerald-700" />
                            </div>
                          )}
                          <span className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 via-emerald-950/10 to-transparent" />
                          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-900 backdrop-blur">
                            {event.isFree ? "Free entry" : "Registration open"}
                          </span>
                          <span className="absolute bottom-3 left-3 right-3 text-xs font-bold text-white">
                            {event.date}
                          </span>
                        </div>

                        <div className="flex flex-col gap-4 p-5 sm:p-6">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              {paid ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-800">
                                  <CheckCircle2 className="h-3 w-3" /> Slot confirmed
                                </span>
                              ) : pending ? (
                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-800">
                                  Payment pending
                                </span>
                              ) : null}
                              {!event.isFree ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-700">
                                  <Ticket className="h-3 w-3" /> from KES {tiers[0]?.amount ?? 650}
                                </span>
                              ) : null}
                            </div>
                            <h3 className="mt-2 text-xl font-black leading-tight text-emerald-950">
                              {event.title}
                            </h3>
                            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">
                              {event.description}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-emerald-800">
                            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5">
                              <Calendar className="h-3.5 w-3.5" /> {event.date}
                            </span>
                            {event.time ? (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5">
                                <Clock className="h-3.5 w-3.5" /> {event.time}
                              </span>
                            ) : null}
                            {event.location ? (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5">
                                <MapPin className="h-3.5 w-3.5" /> {event.location}
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-auto flex flex-wrap gap-2">
                            {paid ? (
                              <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white">
                                <CheckCircle2 className="h-4 w-4" /> You are registered
                              </span>
                            ) : pending ? (
                              <button
                                type="button"
                                onClick={() => continueToPayment(event)}
                                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-amber-950 transition hover:bg-amber-400"
                              >
                                <Smartphone className="h-4 w-4" /> Complete payment
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openModal(event)}
                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-900 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-800"
                              >
                                <Ticket className="h-4 w-4" />
                                {event.isFree ? "Reserve my slot" : "Reserve & pay"}
                              </button>
                            )}
                            {event.galleryLink ? (
                              <a
                                href={event.galleryLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-4 py-3 text-xs font-bold text-emerald-800 transition hover:bg-emerald-50"
                              >
                                <ImageIcon className="h-4 w-4" /> Gallery
                              </a>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {previous.length > 0 ? (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                  <ImageIcon className="h-4 w-4" />
                </span>
                <h2 className="text-lg font-black text-emerald-950">Past events &amp; galleries</h2>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                {previous.map((event) => (
                  <article key={event._id} className="card card-hover overflow-hidden">
                    <div className="relative h-44 bg-emerald-950">
                      {event.imageUrl ? (
                        <img
                          src={optimizedImage(event.imageUrl, 700)}
                          alt={event.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Camera className="h-8 w-8 text-emerald-700" />
                        </div>
                      )}
                      <span className="absolute inset-0 bg-gradient-to-t from-emerald-950/85 via-transparent to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3">
                        <h3 className="text-sm font-black text-white">{event.title}</h3>
                        <p className="text-[10px] font-bold text-emerald-200">{event.date}</p>
                      </div>
                    </div>
                    <div className="space-y-3 p-4">
                      <p className="line-clamp-2 text-xs leading-relaxed text-slate-600">{event.description}</p>
                      <div className="flex items-center justify-between gap-2">
                        {event.galleryLink ? (
                          <a
                            href={event.galleryLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-800 transition hover:bg-emerald-100"
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> Google Photos
                          </a>
                        ) : (
                          <span className="text-[11px] font-semibold text-muted">Club archive</span>
                        )}
                      </div>
                      <EventReactions event={event} userId={user?.id} userName={user?.fullName || undefined} />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-lime-100 text-lime-800">
                  <Leaf className="h-4 w-4" />
                </span>
                <h2 className="text-lg font-black text-emerald-950">Ongoing projects</h2>
              </div>
              {projects.length === 0 ? (
                <div className="card p-6 text-sm text-slate-500">
                  Project updates will appear here as the executive publishes them.
                </div>
              ) : (
                <div className="space-y-4">
                  {projects.map((project) => (
                    <article key={project._id} className="card overflow-hidden">
                      <div className="flex flex-col sm:flex-row">
                        <div className="relative h-40 sm:h-auto sm:w-2/5">
                          {project.imageUrl ? (
                            <img
                              src={optimizedImage(project.imageUrl, 600)}
                              alt={project.title}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-emerald-950">
                              <Leaf className="h-7 w-7 text-emerald-700" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 space-y-2 p-5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                            <Leaf className="h-3 w-3" /> Active initiative
                          </span>
                          <h3 className="text-sm font-black text-emerald-950">{project.title}</h3>
                          <p className="line-clamp-3 text-xs leading-relaxed text-slate-600">
                            {project.description}
                          </p>
                          <EventReactions event={project} userId={user?.id} userName={user?.fullName || undefined} />
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <Users className="h-4 w-4" />
                </span>
                <h2 className="text-lg font-black text-emerald-950">Weekly rhythm</h2>
              </div>
              <div className="card p-5">
                <ul className="space-y-3">
                  {[
                    "Weekly Wednesday physical gathering · 5:00 – 6:45 PM",
                    "EcoPulse wildlife debates",
                    "Monthly campus clean-up drives",
                    "Nature Snap winners announced in person",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-xs font-medium leading-snug text-slate-700"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>
        </>
      )}

      {activeEvent ? (
        <div className="fixed inset-0 z-[75] flex items-end justify-center bg-emerald-950/60 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="animate-pop max-h-[94dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                  {step === "success" ? "Confirmed" : "Event application"}
                </p>
                <h3 className="mt-1 text-lg font-black leading-tight text-emerald-950">{activeEvent.title}</h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-5 flex items-center gap-1.5">
              {["Details", "Payment", "Done"].map((label, index) => {
                const activeStep =
                  step === "form" ? 0 : step === "success" ? 2 : 1;
                const done = step === "success" ? true : index < activeStep;
                return (
                  <div key={label} className="flex flex-1 items-center gap-1.5">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                        done
                          ? "bg-emerald-600 text-white"
                          : index === activeStep
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {done ? "✓" : index + 1}
                    </span>
                    <span
                      className={`text-[10px] font-bold ${
                        index === activeStep ? "text-emerald-900" : "text-slate-400"
                      }`}
                    >
                      {label}
                    </span>
                    {index < 2 ? <span className="h-px flex-1 bg-slate-200" /> : null}
                  </div>
                );
              })}
            </div>

            {error ? (
              <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                {error}
              </p>
            ) : null}

            {step === "form" ? (
              <form onSubmit={submitRegistration} className="space-y-3">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold text-slate-700">Full name</span>
                  <input
                    required
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                    placeholder="Kelvin Maina"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold text-slate-700">Contact phone</span>
                  <input
                    required
                    type="tel"
                    value={form.phone}
                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                    placeholder="0712 345 678"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold text-slate-700">
                    DeKUT registration number
                  </span>
                  <input
                    required
                    value={form.regNo}
                    onChange={(event) => setForm({ ...form, regNo: event.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                    placeholder="C025-01-0000/2023"
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-900 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  {activeEvent.isFree ? "Confirm free slot" : "Continue to payment"}
                </button>
              </form>
            ) : null}

            {step === "ask_pay" ? (
              <div className="space-y-4">
                <div className="rounded-2xl bg-emerald-50 p-4 text-xs leading-relaxed text-emerald-900">
                  Your details are saved. Pay now to lock in your slot, or come back later from your events
                  list.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep("checkout");
                    setPaymentPhone(form.phone);
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-900 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-800"
                >
                  <Smartphone className="h-4 w-4" /> Pay with M-Pesa
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-full rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  Pay later
                </button>
              </div>
            ) : null}

            {step === "checkout" || step === "polling" ? (
              <form onSubmit={initiatePayment} className="space-y-4">
                <div>
                  <p className="mb-2 text-[11px] font-bold text-slate-700">Choose your rate</p>
                  <div className="space-y-2">
                    {tiers.map((tier) => (
                      <label
                        key={tier.id}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs transition ${
                          selectedTier === tier.id
                            ? "border-emerald-500 bg-emerald-50 font-bold text-emerald-900"
                            : "border-slate-200 text-slate-600 hover:border-emerald-300"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="tier"
                            value={tier.id}
                            checked={selectedTier === tier.id}
                            onChange={() => setSelectedTier(tier.id)}
                            className="accent-emerald-700"
                          />
                          {tier.label}
                        </span>
                        <span className="font-black">KES {tier.amount}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold text-slate-700">M-Pesa number</span>
                  <input
                    required
                    inputMode="tel"
                    value={paymentPhone}
                    onChange={(event) => setPaymentPhone(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                    placeholder="0712 345 678"
                  />
                </label>

                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold text-slate-700">
                  <span className="inline-flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-emerald-700" /> Total due
                  </span>
                  <span className="text-base font-black text-emerald-900">KES {selectedAmount}</span>
                </div>

                {notice ? (
                  <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> {notice}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={busy || step === "polling"}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-900 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-60"
                >
                  {busy || step === "polling" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Smartphone className="h-4 w-4" />
                  )}
                  {step === "polling" ? "Waiting for confirmation…" : `Pay KES ${selectedAmount}`}
                </button>
                <p className="text-center text-[10px] text-muted">
                  The prompt usually arrives in under 10 seconds.
                </p>
              </form>
            ) : null}

            {step === "success" ? (
              <div className="space-y-3 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-7 w-7" />
                </span>
                <p className="text-base font-black text-emerald-950">You are registered 🎉</p>
                <p className="text-xs leading-relaxed text-slate-600">
                  {notice || "Payment confirmed. Your slot is locked in."}
                </p>
                {receiptBalance ? (
                  <p className="text-[11px] font-semibold text-emerald-800">
                    Remaining balance: KES {receiptBalance}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-full rounded-xl bg-emerald-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800"
                >
                  Done
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
