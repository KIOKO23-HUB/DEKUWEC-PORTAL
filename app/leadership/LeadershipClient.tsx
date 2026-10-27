"use client";

import { useEffect, useMemo, useState } from "react";

type Applicant = {
  _id: string;
  fullName: string;
  regNo: string;
  role: string;
  motivation: string;
  newIdeas: string;
  heldPositionBefore: boolean;
  previousRole: string;
  impressions: number;
  createdAt: string;
};

type Config = {
  debateDate?: string;
  campaignDate?: string;
  electionDate?: string;
  venue?: string;
  notes?: string;
};

type Feed = {
  applicants: Applicant[];
  totalApplications: number;
  config: Config;
  season: string;
  roles: string[];
  requirements: string[];
  applicationsOpen: boolean;
};

const CLUB_EMAIL = "wildlifeandenvironmentalclub@dkut.ac.ke";

const initialForm = {
  fullName: "",
  regNo: "",
  email: "",
  role: "",
  motivation: "",
  newIdeas: "",
  heldPositionBefore: false,
  previousRole: "",
  confirmedRequirements: false,
};

export default function LeadershipClient() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/leadership/public", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data?.error) setLoadError(data.error);
        else setFeed(data);
      })
      .catch(() => active && setLoadError("Unable to load the election information right now."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const timeline = useMemo(
    () => [
      { label: "Debate & Interrogation", date: feed?.config?.debateDate, icon: "🎤" },
      { label: "Campaigns & Petitions", date: feed?.config?.campaignDate, icon: "📣" },
      { label: "Election Day (Physical Voting)", date: feed?.config?.electionDate, icon: "🗳️" },
    ],
    [feed]
  );

  const update = (key: keyof typeof initialForm, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");
    setSuccess("");

    if (!form.confirmedRequirements) {
      setFormError("Please confirm that you meet all the leadership requirements.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setFormError("Enter a valid student email address so we can send you the decision.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/leadership/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data?.error || "Could not submit your application. Please try again.");
      } else {
        setSuccess(
          `Application received! A confirmation has been sent to ${form.email.trim()}. The Executive Board will email you the decision.`
        );
        setForm(initialForm);
        const refreshed = await fetch("/api/leadership/public", { cache: "no-store" }).then((r) =>
          r.json()
        );
        if (!refreshed?.error) setFeed(refreshed);
      }
    } catch {
      setFormError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 text-white">
        <div className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-teal-300/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-5 py-14 sm:py-20">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-200">
              DEKUWEC · {feed?.season ?? "Leadership"} Elections
            </span>
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${
                feed?.applicationsOpen
                  ? "bg-emerald-400 text-emerald-950"
                  : "bg-amber-300 text-amber-950"
              }`}
            >
              {loading ? "Loading…" : feed?.applicationsOpen ? "Applications Open" : "Applications Closed"}
            </span>
          </div>

          <h1 className="mt-6 max-w-3xl text-3xl font-black leading-tight tracking-tight sm:text-5xl">
            Lead the Wildlife &amp; Environmental Club
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-emerald-100/90 sm:text-base">
            Apply for an executive position, follow the election activity dates, and see who is running.
            Decisions are sent to your student email. Official voting is physical on election day.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#apply"
              className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-emerald-900 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-50"
            >
              Apply Now
            </a>
            <a
              href="#applicants"
              className="rounded-xl border border-white/25 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              View Applicants
            </a>
          </div>

          <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
            {[
              { value: feed?.totalApplications ?? 0, label: "Applications" },
              { value: feed?.applicants?.length ?? 0, label: "Approved" },
              { value: feed?.roles?.length ?? 0, label: "Positions" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur"
              >
                <p className="text-xl font-black text-white">{stat.value}</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-200/80">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-12">
        {loadError && (
          <p className="mb-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {loadError}
          </p>
        )}

        <section className="grid gap-6 lg:grid-cols-3">
          {timeline.map((item) => (
            <div
              key={item.label}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="text-2xl">{item.icon}</span>
              <h3 className="mt-3 text-sm font-bold text-slate-900">{item.label}</h3>
              <p
                className={`mt-2 text-sm font-semibold ${
                  item.date ? "text-emerald-700" : "text-amber-600"
                }`}
              >
                {item.date || "Date to be announced"}
              </p>
            </div>
          ))}
        </section>

        {(feed?.config?.venue || feed?.config?.notes) && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
            {feed?.config?.venue && (
              <p>
                <span className="font-bold">Venue:</span> {feed.config.venue}
              </p>
            )}
            {feed?.config?.notes && <p className="mt-1">{feed.config.notes}</p>}
          </div>
        )}

        <section className="mt-14 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-black tracking-tight text-slate-900">Open Positions</h2>
            <p className="mt-1 text-sm text-slate-500">Choose the office you want to contest.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {(feed?.roles ?? []).map((role) => (
                <span
                  key={role}
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700"
                >
                  {role}
                </span>
              ))}
            </div>

            <h3 className="mt-8 text-sm font-black uppercase tracking-[0.12em] text-slate-500">
              Requirements
            </h3>
            <ul className="mt-3 space-y-2">
              {(feed?.requirements ?? []).map((req) => (
                <li key={req} className="flex gap-3 text-sm leading-relaxed text-slate-700">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-700">
                    ✓
                  </span>
                  {req}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-black tracking-tight text-slate-900">How It Works</h2>
            <ol className="mt-4 space-y-4">
              {[
                "Fill the application form with your student email and manifesto.",
                "Receive an instant confirmation email with everything you submitted.",
                "The Executive Board reviews and emails you the decision.",
                "Campaign, debate, then vote physically on election day.",
              ].map((step, index) => (
                <li key={step} className="flex gap-3 text-sm leading-relaxed text-slate-700">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-900 text-[11px] font-bold text-white">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <a
              href={`mailto:${CLUB_EMAIL}`}
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
            >
              ✉️ {CLUB_EMAIL}
            </a>
          </div>
        </section>

        <section id="apply" className="mt-14 scroll-mt-6">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-5 sm:px-8">
              <h2 className="text-lg font-black tracking-tight text-slate-900">Application Form</h2>
              <p className="mt-1 text-sm text-slate-500">
                No portal account needed. Your student email is required for the response.
              </p>
            </div>

            {feed && !feed.applicationsOpen ? (
              <div className="px-6 py-12 text-center sm:px-8">
                <p className="text-3xl">🔒</p>
                <h3 className="mt-3 text-base font-bold text-slate-900">
                  Applications are closed for this season
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                  Follow the timeline above and reach us at{" "}
                  <a className="font-semibold text-emerald-700" href={`mailto:${CLUB_EMAIL}`}>
                    {CLUB_EMAIL}
                  </a>{" "}
                  for any clarification.
                </p>
              </div>
            ) : success ? (
              <div className="px-6 py-12 text-center sm:px-8">
                <p className="text-3xl">✅</p>
                <h3 className="mt-3 text-base font-bold text-slate-900">Application submitted</h3>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-600">{success}</p>
                <button
                  onClick={() => setSuccess("")}
                  className="mt-6 rounded-xl bg-emerald-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
                >
                  Submit another application
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 px-6 py-7 sm:px-8">
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-semibold text-slate-700">Full Name *</span>
                    <input
                      required
                      value={form.fullName}
                      onChange={(e) => update("fullName", e.target.value)}
                      placeholder="e.g. Jane Wanjiku"
                      className={inputClass}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-semibold text-slate-700">Registration Number *</span>
                    <input
                      required
                      value={form.regNo}
                      onChange={(e) => update("regNo", e.target.value)}
                      placeholder="e.g. S21/01234/22"
                      className={inputClass}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-semibold text-slate-700">Student Email *</span>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      placeholder="you@student.dkut.ac.ke"
                      className={inputClass}
                    />
                    <span className="mt-1 block text-xs text-slate-400">
                      All responses and the final decision are sent here.
                    </span>
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-semibold text-slate-700">Position *</span>
                    <select
                      required
                      value={form.role}
                      onChange={(e) => update("role", e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select a position</option>
                      {(feed?.roles ?? []).map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block text-sm">
                  <span className="mb-1.5 block font-semibold text-slate-700">
                    What aspires you to take this role? *
                  </span>
                  <textarea
                    required
                    rows={4}
                    value={form.motivation}
                    onChange={(e) => update("motivation", e.target.value)}
                    placeholder="Share your motivation and what the club means to you…"
                    className={inputClass}
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1.5 block font-semibold text-slate-700">
                    What is new that you will do for the club? *
                  </span>
                  <textarea
                    required
                    rows={4}
                    value={form.newIdeas}
                    onChange={(e) => update("newIdeas", e.target.value)}
                    placeholder="Outline your ideas, plans and initiatives…"
                    className={inputClass}
                  />
                </label>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <label className="flex items-start gap-3 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.heldPositionBefore}
                      onChange={(e) => update("heldPositionBefore", e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-emerald-700"
                    />
                    I have held a leadership position before
                  </label>
                  {form.heldPositionBefore && (
                    <input
                      value={form.previousRole}
                      onChange={(e) => update("previousRole", e.target.value)}
                      placeholder="Which position and where?"
                      className={`${inputClass} mt-3`}
                    />
                  )}
                </div>

                <label className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm leading-relaxed text-emerald-900">
                  <input
                    type="checkbox"
                    required
                    checked={form.confirmedRequirements}
                    onChange={(e) => update("confirmedRequirements", e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-emerald-700"
                  />
                  I confirm that I meet all the leadership requirements listed above and that the
                  information provided is true.
                </label>

                {formError && (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {formError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-emerald-900 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {submitting ? "Submitting…" : "Submit Application"}
                </button>
              </form>
            )}
          </div>
        </section>

        <section id="applicants" className="mt-14 scroll-mt-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900">Approved Applicants</h2>
              <p className="mt-1 text-sm text-slate-500">
                Candidates cleared by the Executive Board for this season.
              </p>
            </div>
            <span className="rounded-full bg-slate-200/70 px-3 py-1 text-xs font-bold text-slate-600">
              {feed?.applicants?.length ?? 0} candidate{(feed?.applicants?.length ?? 0) === 1 ? "" : "s"}
            </span>
          </div>

          {loading ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-40 animate-pulse rounded-3xl bg-slate-200/60" />
              ))}
            </div>
          ) : (feed?.applicants?.length ?? 0) === 0 ? (
            <p className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
              No applicants have been approved yet. Approved candidates will appear here.
            </p>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {feed?.applicants.map((applicant) => (
                <article
                  key={applicant._id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-900 text-sm font-black text-white">
                      {applicant.fullName
                        .split(" ")
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join("")
                        .toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-slate-900">{applicant.fullName}</h3>
                      <p className="text-xs font-semibold text-emerald-700">{applicant.role}</p>
                      <p className="text-[11px] text-slate-400">{applicant.regNo}</p>
                    </div>
                  </div>

                  {applicant.heldPositionBefore && (
                    <p className="mt-3 inline-block rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                      Previously {applicant.previousRole || "in leadership"}
                    </p>
                  )}

                  <details className="group mt-4">
                    <summary className="cursor-pointer list-none text-xs font-bold text-emerald-700 hover:text-emerald-800">
                      Read manifesto <span className="group-open:hidden">→</span>
                      <span className="hidden group-open:inline">↓</span>
                    </summary>
                    <div className="mt-3 space-y-3 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-600">
                      <div>
                        <p className="font-bold uppercase tracking-[0.1em] text-slate-400">Motivation</p>
                        <p className="mt-1 whitespace-pre-wrap">{applicant.motivation}</p>
                      </div>
                      <div>
                        <p className="font-bold uppercase tracking-[0.1em] text-slate-400">New Ideas</p>
                        <p className="mt-1 whitespace-pre-wrap">{applicant.newIdeas}</p>
                      </div>
                    </div>
                  </details>

                  <p className="mt-4 text-[11px] font-semibold text-slate-400">
                    ❤️ {applicant.impressions} online impression
                    {applicant.impressions === 1 ? "" : "s"}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Dedan Kimathi Wildlife &amp; Environmental Club · DEKUWEC
          </p>
          <a className="font-semibold text-emerald-700 hover:text-emerald-800" href={`mailto:${CLUB_EMAIL}`}>
            {CLUB_EMAIL}
          </a>
        </div>
      </footer>
    </div>
  );
}
