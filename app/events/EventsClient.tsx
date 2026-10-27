"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

function EventCard({ event }: { event: PublicEvent }) {
  const [step, setStep] = useState<Step>("idle");
  const [form, setForm] = useState({ fullName: "", regNo: "", email: "", phone: "", tierId: event.tiers[0]?.id || "" });
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [payPhone, setPayPhone] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState("");

  const tier = event.tiers.find((item) => item.id === form.tierId) || event.tiers[0];

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
    setStep("paying");

    try {
      const pushRes = await fetch("/api/mpesa/stkpush", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: registration.clerkId,
          fullName: form.fullName,
          phone: payPhone,
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

      setNotice("Check your phone and enter your M-Pesa PIN.");
      let attempts = 0;
      const timer = setInterval(async () => {
        attempts += 1;
        try {
          const statusRes = await fetch(`/api/mpesa/status?id=${pushData.paymentId}`);
          const statusData = await statusRes.json();
          if (statusData.status === "Completed") {
            clearInterval(timer);
            setReceipt(statusData.receipt || "");
            setNotice("");
            setStep("success");
            setBusy(false);
          } else if (statusData.status === "Failed" || attempts >= 30) {
            clearInterval(timer);
            setError(
              statusData.status === "Failed"
                ? "Payment failed. Please check your balance and try again."
                : "Payment is taking too long. If you were charged, contact the club with your receipt."
            );
            setBusy(false);
          }
        } catch {
          /* keep polling */
        }
      }, 3000);
    } catch {
      setError("Server connection failed. Please try again.");
      setBusy(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {event.imageUrl && (
        <div className="w-full bg-slate-100">
          {/* Poster shown in full, never cropped, on any screen size */}
          <img
            src={event.imageUrl}
            alt={`${event.title} poster`}
            className="block h-auto w-full object-contain"
            loading="eager"
          />
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

        {step === "idle" && (
          <button
            onClick={() => setStep("details")}
            className="w-full rounded-xl bg-emerald-900 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-800 sm:w-auto"
          >
            Register {event.isFree ? "" : "& Pay"}
          </button>
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
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <p>
                <strong className="text-slate-900">{registration.tierLabel}</strong> · KES {registration.amount}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                An M-Pesa prompt is sent to the number below. Keep this page open until it confirms.
              </p>
            </div>
            <label className="block text-sm">
              <span className="mb-1.5 block font-semibold text-slate-700">M-Pesa number</span>
              <input required value={payPhone} onChange={(e) => setPayPhone(e.target.value)} className={inputClass} placeholder="0712345678" />
            </label>
            {notice && <p className="text-sm font-medium text-emerald-700">{notice}</p>}
            {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-emerald-900 px-6 py-3.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60 sm:w-auto"
            >
              {busy ? "Waiting for M-Pesa…" : `Pay KES ${registration.amount} with M-Pesa`}
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
      </div>
    </article>
  );
}

export default function EventsClient() {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/public/events", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data?.error) setError(data.error);
        else setEvents(data.events || []);
      })
      .catch(() => setError("Unable to load events right now."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-emerald-900/20 bg-emerald-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-5 py-3">
          <span className="text-sm font-black tracking-tight text-white">DEKUWEC Events</span>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-emerald-900 transition hover:bg-emerald-50"
          >
            ← Main Site
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-black tracking-tight text-emerald-950 sm:text-3xl">Upcoming Events</h1>
          <p className="mt-2 text-sm text-slate-600">
            Register and pay via M-Pesa in under a minute. No portal account needed.
          </p>
        </div>

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
          <div className="space-y-8">
            {events.map((event) => (
              <EventCard key={event._id} event={event} />
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
