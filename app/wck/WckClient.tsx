"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  ShieldCheck, Loader2, CheckCircle, Smartphone, GraduationCap, Users, Leaf,
} from "lucide-react";
import PublicPageShell from "@/components/PublicPageShell";
import NotifyForm from "@/components/NotifyForm";
import GoogleContinueButton from "@/components/GoogleContinueButton";

const YEAR_OPTIONS = ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Alumni / Staff"];

export default function WckClient() {
  const { user } = useUser();
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    yearOfStudy: "Year 1",
    ageBracket: "Below 23 years",
  });

  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      fullName: prev.fullName || user.fullName || "",
      email: prev.email || user.primaryEmailAddress?.emailAddress || "",
    }));
  }, [user]);

  const fee = form.ageBracket === "23 years and above" ? 230 : 100;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/public/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "wck", clerkId: user?.id, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Application failed.");
      setDone(data.message || "Application received.");
    } catch (err: any) {
      setError(err?.message || "Application failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PublicPageShell active="wck">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 to-emerald-950 p-6 text-white shadow-xl sm:p-10">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <div className="rounded-2xl bg-white p-3 shadow-lg">
            <img src="/wck-logo.png" alt="Wildlife Clubs of Kenya" className="h-24 w-24 object-contain" />
          </div>
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="h-3.5 w-3.5" /> WCK Student Affiliate Card
            </span>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl">Learn to conserve for a better tomorrow.</h1>
            <p className="mt-2 max-w-2xl text-sm text-emerald-100">
              Apply for the official Wildlife Clubs of Kenya card and unlock park access, conservation forums
              and club perks. Your email joins the DEKUWEC member directory for notifications.
            </p>
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-black text-emerald-950">
            <GraduationCap className="h-5 w-5 text-emerald-600" /> Apply for your card
          </h2>

          {done ? (
            <div className="mt-6 space-y-4 rounded-2xl bg-emerald-50 p-6 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-emerald-600" />
              <p className="text-sm font-bold text-emerald-900">{done}</p>
              <p className="text-xs text-emerald-800">
                You have been added to the member directory. Complete the M-Pesa payment on the member portal
                so the executive can verify your card.
              </p>
              <a
                href="/dashboard/wck-card"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
              >
                <Smartphone className="h-4 w-4" /> Complete payment
              </a>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-5 space-y-3">
              <input
                required
                value={form.fullName}
                onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                placeholder="Full name"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-600"
              />
              <input
                required
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="Email (for notifications)"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-600"
              />
              <input
                required
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                placeholder="M-Pesa phone (07XX XXX XXX)"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-600"
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <select
                  value={form.yearOfStudy}
                  onChange={(event) => setForm({ ...form, yearOfStudy: event.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-600"
                >
                  {YEAR_OPTIONS.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <select
                  value={form.ageBracket}
                  onChange={(event) => setForm({ ...form, ageBracket: event.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-600"
                >
                  <option value="Below 23 years">Below 23 years</option>
                  <option value="23 years and above">23 years and above</option>
                </select>
              </div>

              <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
                Card fee: KES {fee}
              </div>

              {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}

              <button
                type="submit"
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Submit application
              </button>

              {!user ? (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-center">
                  <p className="text-xs text-emerald-800">
                    Sign in with Google to keep this application on your profile. No OTP needed.
                  </p>
                  <div className="mt-3 flex justify-center">
                    <GoogleContinueButton label="Continue with Google" className="!py-2 !text-xs" />
                  </div>
                </div>
              ) : (
                <p className="text-center text-xs text-gray-500">
                  Saved to your profile as {user.fullName || user.username}
                </p>
              )}
            </form>
          )}
        </section>

        <div className="space-y-6">
          <NotifyForm
            title="WCK updates by email"
            description="Get card verification, payment and collection updates. Your email joins the member directory."
          />
          <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-emerald-900">
              <Users className="h-4 w-4" /> Why join?
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <Leaf className="mt-0.5 h-4 w-4 text-emerald-600" /> Access to WCK conservation programmes.
              </li>
              <li className="flex items-start gap-2">
                <Leaf className="mt-0.5 h-4 w-4 text-emerald-600" /> Park entry concessions for members.
              </li>
              <li className="flex items-start gap-2">
                <Leaf className="mt-0.5 h-4 w-4 text-emerald-600" /> National wildlife clubs network.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </PublicPageShell>
  );
}
