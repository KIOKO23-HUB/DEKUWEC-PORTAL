"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bell, CalendarClock, Leaf, Sparkles, X } from "lucide-react";

type EcoPulse = {
  spotlight: {
    emoji: string;
    tag: string;
    title: string;
    fact: string;
    action: string;
    cta: { label: string; href: string };
  };
  tip: string;
  tips: string[];
  reminder: {
    title: string;
    date: string;
    location: string;
    daysLeft: number | null;
    message: string;
    href: string;
  } | null;
  pulse: { weeklyPosts: number; latestCaption: string; message: string };
};

function useEcoPulse() {
  const [data, setData] = useState<EcoPulse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/ai/eco-spotlight", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("unavailable"))))
      .then((payload: EcoPulse) => {
        if (active) setData(payload);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return { data, failed };
}

function useRotatingTip(tips: string[] | undefined, fallback: string) {
  const [index, setIndex] = useState(0);
  const list = tips && tips.length ? tips : fallback ? [fallback] : [];

  useEffect(() => {
    if (list.length < 2) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % list.length), 9000);
    return () => window.clearInterval(timer);
  }, [list.length]);

  return list[index % Math.max(list.length, 1)] || "";
}

export function EcoSpotlightCard({ className = "" }: { className?: string }) {
  const { data, failed } = useEcoPulse();
  const tip = useRotatingTip(data?.tips, data?.tip || "");

  if (failed) return null;

  return (
    <section
      className={`card animate-rise overflow-hidden ${className}`}
      aria-label="EcoPulse AI wildlife spotlight"
    >
      <div className="hero-mesh animate-gradient px-5 py-4 text-white">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] backdrop-blur">
            <Sparkles className="h-3 w-3 text-lime-300" /> EcoPulse AI
          </span>
          {data ? <span className="text-2xl animate-float">{data.spotlight.emoji}</span> : null}
        </div>
        <h3 className="mt-2.5 text-base font-black leading-snug text-balance">
          {data ? data.spotlight.title : "Loading today's wildlife spotlight…"}
        </h3>
        {data ? (
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-lime-200">
            {data.spotlight.tag}
          </p>
        ) : null}
      </div>

      <div className="space-y-3 p-5">
        {data ? (
          <>
            <p className="text-sm leading-relaxed text-slate-600">{data.spotlight.fact}</p>
            <div className="rounded-xl border-l-4 border-emerald-400 bg-emerald-50/70 px-3.5 py-2.5">
              <p className="text-[11px] font-black uppercase tracking-wider text-emerald-700">Do this today</p>
              <p className="mt-1 text-xs font-medium leading-relaxed text-emerald-900">
                {data.spotlight.action}
              </p>
            </div>
            {tip ? (
              <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted">
                <Leaf className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span key={tip} className="animate-fade">{tip}</span>
              </p>
            ) : null}
            <Link
              href={data.spotlight.cta.href}
              className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-800 transition hover:text-emerald-600"
            >
              {data.spotlight.cta.label} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </>
        ) : (
          <div className="space-y-2">
            <div className="skeleton h-3 w-11/12 rounded-full" />
            <div className="skeleton h-3 w-9/12 rounded-full" />
            <div className="skeleton h-3 w-10/12 rounded-full" />
          </div>
        )}
      </div>
    </section>
  );
}

export function EventReminderCard({ className = "" }: { className?: string }) {
  const { data } = useEcoPulse();
  const reminder = data?.reminder;

  if (!reminder) return null;

  return (
    <section
      className={`card overflow-hidden border-amber-200/70 ${className}`}
      aria-label="Upcoming event reminder"
    >
      <div className="flex items-start gap-3 p-4">
        <span className="relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <CalendarClock className="h-5 w-5" />
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse-ring" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-700">
            Reminder{daysLabel(reminder.daysLeft)}
          </p>
          <h3 className="mt-0.5 truncate text-sm font-black text-emerald-950">{reminder.title}</h3>
          <p className="mt-0.5 text-[11px] font-semibold text-muted">
            {reminder.date}
            {reminder.location ? ` · ${reminder.location}` : ""}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{reminder.message}</p>
          <Link
            href={reminder.href}
            className="mt-2 inline-flex items-center gap-1 text-xs font-black text-amber-800 hover:text-amber-600"
          >
            Reserve a slot <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function daysLabel(days: number | null) {
  if (days === null) return "";
  if (days === 0) return " · today";
  return ` · in ${days} day${days === 1 ? "" : "s"}`;
}

export function EcoPopup() {
  const { data } = useEcoPulse();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!data) return;
    if (sessionStorage.getItem("dekuwec_eco_popup") === "seen") return;
    const timer = window.setTimeout(() => setOpen(true), 7000);
    return () => window.clearTimeout(timer);
  }, [data]);

  const dismiss = () => {
    sessionStorage.setItem("dekuwec_eco_popup", "seen");
    setOpen(false);
  };

  const reminder = data?.reminder;

  const headline = useMemo(() => {
    if (!data) return "";
    return data.spotlight.title;
  }, [data]);

  if (!open || !data) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[80] flex justify-center p-3 sm:inset-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Wildlife spotlight"
    >
      <button
        type="button"
        aria-label="Dismiss spotlight"
        onClick={dismiss}
        className="absolute inset-0 bg-emerald-950/55 backdrop-blur-sm"
      />
      <div className="animate-pop relative z-10 w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="hero-mesh animate-gradient relative px-6 pb-6 pt-7 text-white">
          <button
            type="button"
            onClick={dismiss}
            aria-label="Close"
            className="absolute right-3 top-3 rounded-full bg-white/15 p-2 text-white backdrop-blur transition hover:bg-white/25"
          >
            <X className="h-4 w-4" />
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] backdrop-blur">
            <Sparkles className="h-3 w-3 text-lime-300" /> Wildlife spotlight
          </span>
          <div className="mt-3 flex items-start gap-3">
            <span className="animate-float text-4xl">{data.spotlight.emoji}</span>
            <h2 className="text-lg font-black leading-snug text-balance">{headline}</h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-emerald-50/95">{data.spotlight.fact}</p>
        </div>

        <div className="space-y-3 p-5">
          <div className="rounded-xl border-l-4 border-emerald-400 bg-emerald-50 px-3.5 py-2.5">
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Try this today</p>
            <p className="mt-1 text-xs font-medium leading-relaxed text-emerald-900">
              {data.spotlight.action}
            </p>
          </div>

          {reminder ? (
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-amber-900">
              <Bell className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-xs font-semibold leading-relaxed">
                {reminder.message} <span className="font-bold">{reminder.title}</span>
              </p>
            </div>
          ) : null}

          <div className="flex gap-2 pt-1">
            <Link
              href={data.spotlight.cta.href}
              onClick={dismiss}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-800 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-900"
            >
              {data.spotlight.cta.label} <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
