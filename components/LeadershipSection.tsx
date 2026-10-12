"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Crown,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ArrowLeft,
  ThumbsUp,
  ChevronDown,
  ChevronUp,
  Calendar,
  Megaphone,
  Mic,
  Vote,
  Info,
  FileText,
  Award,
} from "lucide-react";

const DEFAULT_ROLES = [
  "Chairperson",
  "Vice Chairperson",
  "Secretary",
  "Organizing Secretary",
  "Treasurer",
  "Information Director",
  "Public Representative (PR)",
  "Social Media Director",
  "ICT Manager",
  "First Year Representative",
];

const DEFAULT_REQUIREMENTS = [
  "Registered DEKUWEC member for the 2025/2026 membership year",
  "Attendance of club meetings on a regular basis",
  "Participation in at least 2 club activities per semester",
  "A continuing student at Dedan Kimathi University of Technology",
  "Good public address and communication skills",
];

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
  impressedBy: string[];
};

// Election dates are stored as ISO strings (YYYY-MM-DD) by the admin
function formatElectionDate(value?: string) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function LeadershipSection() {
  const { user, isLoaded } = useUser();

  const [activeTab, setActiveTab] = useState<"apply" | "applicants">("apply");
  const [loading, setLoading] = useState(true);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [season, setSeason] = useState("2026/2027");
  const [roles, setRoles] = useState<string[]>(DEFAULT_ROLES);
  const [requirements, setRequirements] = useState<string[]>(DEFAULT_REQUIREMENTS);
  const [myApplication, setMyApplication] = useState<any>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [impressingId, setImpressingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullName: "",
    regNo: "",
    email: "",
    role: "",
    motivation: "",
    newIdeas: "",
    heldPositionBefore: "no" as "no" | "yes",
    previousRole: "",
  });

  const loadLeadershipData = useCallback(async () => {
    try {
      const query = user?.id ? `?clerkId=${user.id}` : "";
      const res = await fetch(`/api/leadership${query}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setApplicants(data.applicants || []);
      setConfig(data.config || null);
      setSeason(data.season || "2026/2027");
      setRoles(data.roles?.length ? data.roles : DEFAULT_ROLES);
      setRequirements(data.requirements?.length ? data.requirements : DEFAULT_REQUIREMENTS);
      setMyApplication(data.myApplication || null);
    } catch (err) {
      console.error("Failed to load leadership data", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadLeadershipData();
  }, [loadLeadershipData]);

  // Pre-fill the applicant details from the signed in student
  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        fullName: prev.fullName || user.fullName || "",
        email: prev.email || user.primaryEmailAddress?.emailAddress || "",
      }));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/leadership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: user?.id,
          fullName: form.fullName,
          regNo: form.regNo,
          email: form.email,
          role: form.role,
          motivation: form.motivation,
          newIdeas: form.newIdeas,
          heldPositionBefore: form.heldPositionBefore === "yes",
          previousRole: form.previousRole,
          confirmedRequirements: accepted,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to submit your application. Please try again.");
        return;
      }

      setMyApplication(data.application);
      setConfig(data.config || config);
      setStep(3);
    } catch (err) {
      console.error(err);
      setError("Something went wrong while submitting your application.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleImpression = async (applicant: Applicant) => {
    if (!user?.id) return;
    setImpressingId(applicant._id);

    try {
      const res = await fetch("/api/leadership/impressions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: applicant._id, clerkId: user.id }),
      });

      if (res.ok) {
        const data = await res.json();
        setApplicants((prev) =>
          prev.map((item) =>
            item._id === applicant._id
              ? {
                  ...item,
                  impressions: data.impressions,
                  impressedBy: data.impressed
                    ? [...item.impressedBy, user.id]
                    : item.impressedBy.filter((id) => id !== user.id),
                }
              : item
          )
        );
      }
    } catch (err) {
      console.error("Failed to record impression", err);
    } finally {
      setImpressingId(null);
    }
  };

  const timeline = [
    { title: "Debate & Interrogation", date: config?.debateDate, icon: Mic },
    { title: "Campaigns & Petitions", date: config?.campaignDate, icon: Megaphone },
    { title: "Election Day (Physical Voting)", date: config?.electionDate, icon: Vote },
  ];

  const statusBanner = (application: any) => {
    if (!application) return null;

    const styles =
      application.status === "Approved"
        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
        : application.status === "Rejected"
        ? "bg-rose-50 border-rose-200 text-rose-900"
        : "bg-amber-50 border-amber-200 text-amber-900";

    return (
      <div className={`rounded-2xl border p-5 text-sm font-semibold ${styles}`}>
        <p className="font-black">
          {application.status === "Approved"
            ? "Your application has been approved"
            : application.status === "Rejected"
            ? "Your application was not successful"
            : "Your application is awaiting review"}
        </p>
        <p className="mt-1 font-medium">
          Position: {application.role} &middot; Status: {application.status}
          {application.reviewNote ? ` \u00b7 ${application.reviewNote}` : ""}
        </p>
      </div>
    );
  };

  return (
    <section id="leadership" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-black uppercase tracking-wider mb-3">
            <Crown className="h-3.5 w-3.5" /> Leadership Elections {season}
          </div>
          <h2 className="text-2xl font-black text-emerald-950">Leadership Application</h2>
          <p className="text-sm text-gray-500 mt-1">
            Apply for an executive position, then track candidates by the category they vie for.
          </p>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setActiveTab("apply")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === "apply" ? "bg-white text-emerald-800 shadow-sm" : "text-gray-500 hover:text-emerald-700"
            }`}
          >
            Apply as a Leader
          </button>
          <button
            onClick={() => setActiveTab("applicants")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === "applicants" ? "bg-white text-emerald-800 shadow-sm" : "text-gray-500 hover:text-emerald-700"
            }`}
          >
            Applicants ({applicants.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-emerald-700 bg-white rounded-3xl border border-gray-100">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm font-bold">Loading leadership elections...</p>
        </div>
      ) : activeTab === "apply" ? (
        <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          {config && !config.applicationsOpen && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-900">
              Leadership applications for {season} are currently closed. Please check back when the Executive Board
              opens the next application window.
            </div>
          )}

          {step < 3 && statusBanner(myApplication)}

          {/* After a successful submission we always show the congratulation recap, even though the
              application is now sitting in "Pending Review" */}
          {myApplication && myApplication.status !== "Rejected" && step !== 3 ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                You have already applied for the position of{" "}
                <strong className="text-gray-800">{myApplication.role}</strong>. You can follow the elections under the
                Applicants tab.
              </p>
              <button
                onClick={() => setActiveTab("applicants")}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm transition"
              >
                <Award className="h-4 w-4" /> View Leadership Applicants
              </button>
            </div>
          ) : step === 1 ? (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-black text-emerald-950">Requirements for a DEKUWEC Leader</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Read through every requirement below before you proceed with your application.
                </p>
              </div>

              <ul className="space-y-3">
                {requirements.map((requirement, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm font-medium text-gray-700"
                  >
                    <span className="h-6 w-6 shrink-0 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-black">
                      {index + 1}
                    </span>
                    {requirement}
                  </li>
                ))}
              </ul>

              <label className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-0.5 h-5 w-5 accent-emerald-700 shrink-0"
                />
                <span className="text-sm font-semibold text-emerald-900">
                  I confirm that I qualify and meet every one of the requirements listed above.
                </span>
              </label>

              <button
                onClick={() => setStep(2)}
                disabled={!accepted || (config && !config.applicationsOpen)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-300 text-white font-bold text-sm transition"
              >
                Continue to Application <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : step === 2 ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-black text-emerald-950">Leadership Application Form</h3>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-emerald-700"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to requirements
                </button>
              </div>

              {myApplication?.status === "Rejected" && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
                  Your previous application was not successful. You may resubmit an updated application.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    placeholder="e.g. Curtis Kioko"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-emerald-600 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Registration Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.regNo}
                    onChange={(e) => setForm({ ...form, regNo: e.target.value })}
                    placeholder="e.g. S123/45678/2024"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-emerald-600 outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Student Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="e.g. name@students.dkut.ac.ke"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-emerald-600 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Position You Are Vying For *
                  </label>
                  <select
                    required
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white focus:border-emerald-600 outline-none transition"
                  >
                    <option value="">Select a position...</option>
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  What Aspires You To Take This Role? *
                </label>
                <textarea
                  required
                  rows={4}
                  value={form.motivation}
                  onChange={(e) => setForm({ ...form, motivation: e.target.value })}
                  placeholder="Share what motivates you to lead the club in this position..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-emerald-600 outline-none transition resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  What New Are You Going To Do For The Club? *
                </label>
                <textarea
                  required
                  rows={4}
                  value={form.newIdeas}
                  onChange={(e) => setForm({ ...form, newIdeas: e.target.value })}
                  placeholder="Outline the new programs, ideas or improvements you will introduce..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-emerald-600 outline-none transition resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Have You Ever Taken A Leadership Position? *
                  </label>
                  <div className="flex gap-3">
                    {(["no", "yes"] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setForm({ ...form, heldPositionBefore: option })}
                        className={`flex-1 px-4 py-3 rounded-xl border text-sm font-bold capitalize transition ${
                          form.heldPositionBefore === option
                            ? "bg-emerald-700 border-emerald-700 text-white"
                            : "bg-white border-gray-200 text-gray-600 hover:border-emerald-300"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
                {form.heldPositionBefore === "yes" && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Role You Held / Specify
                    </label>
                    <input
                      type="text"
                      value={form.previousRole}
                      onChange={(e) => setForm({ ...form, previousRole: e.target.value })}
                      placeholder="e.g. Class representative, Club organizing secretary"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-emerald-600 outline-none transition"
                    />
                  </div>
                )}
              </div>

              {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || (config && !config.applicationsOpen)}
                className="w-full py-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-300 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-md"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                <span>{submitting ? "Submitting Application..." : "Submit Leadership Application"}</span>
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="text-center space-y-3">
                <div className="h-16 w-16 mx-auto bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-black text-emerald-950">
                  Congratulations, {myApplication?.fullName || form.fullName}!
                </h3>
                <p className="text-sm text-gray-500 max-w-xl mx-auto">
                  Your application to run as <strong>{myApplication?.role || form.role}</strong> in the DEKUWEC{" "}
                  {season} leadership elections has been received. A confirmation email with all your responses has been
                  sent to <strong>{myApplication?.email || form.email}</strong>.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 space-y-2 text-sm">
                <p className="text-[11px] font-black uppercase tracking-wider text-emerald-800 mb-2">
                  Your Submitted Responses
                </p>
                <p className="text-gray-700">
                  <strong>Full Name:</strong> {myApplication?.fullName || form.fullName}
                </p>
                <p className="text-gray-700">
                  <strong>Registration Number:</strong> {myApplication?.regNo || form.regNo}
                </p>
                <p className="text-gray-700">
                  <strong>Student Email:</strong> {myApplication?.email || form.email}
                </p>
                <p className="text-gray-700">
                  <strong>Position:</strong> {myApplication?.role || form.role}
                </p>
                <p className="text-gray-700">
                  <strong>Previous Leadership Post:</strong>{" "}
                  {(myApplication?.heldPositionBefore ?? form.heldPositionBefore === "yes")
                    ? myApplication?.previousRole || form.previousRole || "Yes (role not specified)"
                    : "No"}
                </p>
                <p className="text-gray-700 whitespace-pre-wrap">
                  <strong>What Aspires You:</strong> {myApplication?.motivation || form.motivation}
                </p>
                <p className="text-gray-700 whitespace-pre-wrap">
                  <strong>What Is New You Will Do:</strong> {myApplication?.newIdeas || form.newIdeas}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-white p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-emerald-600" />
                  <h4 className="text-base font-black text-emerald-950">What To Expect Next</h4>
                </div>
                <div className="space-y-3">
                  {timeline.map((item) => (
                    <div
                      key={item.title}
                      className="flex items-start justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <item.icon className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                        <span className="text-sm font-bold text-gray-800">{item.title}</span>
                      </div>
                      <span
                        className={`text-xs font-bold text-right shrink-0 ${
                          item.date ? "text-emerald-700" : "text-amber-600"
                        }`}
                      >
                        {item.date ? formatElectionDate(item.date) : "Date to be announced"}
                      </span>
                    </div>
                  ))}
                </div>
                {config?.venue && (
                  <p className="text-xs font-semibold text-gray-500">Venue: {config.venue}</p>
                )}
                <div className="flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                  <Info className="h-4 w-4 text-emerald-700 mt-0.5 shrink-0" />
                  <p className="text-xs font-semibold text-emerald-900">
                    Official voting is conducted physically on election day. The impressions on this portal are for
                    encouragement only and do not replace the physical ballot.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab("applicants")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm transition"
              >
                <Award className="h-4 w-4" /> View Leadership Applicants
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-black text-emerald-950">Election Timeline ({season})</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {timeline.map((item) => (
                <div key={item.title} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <item.icon className="h-5 w-5 text-emerald-600 mb-3" />
                  <p className="text-sm font-bold text-gray-800">{item.title}</p>
                  <p className={`text-xs font-bold mt-1 ${item.date ? "text-emerald-700" : "text-amber-600"}`}>
                    {item.date ? formatElectionDate(item.date) : "Date to be announced"}
                  </p>
                </div>
              ))}
            </div>
            {config?.venue && <p className="text-xs font-semibold text-gray-500">Venue: {config.venue}</p>}
            <div className="flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-100 p-4">
              <Info className="h-4 w-4 text-emerald-700 mt-0.5 shrink-0" />
              <p className="text-xs font-semibold text-emerald-900">
                Candidates are published by the position they vie for. Leave an impression to encourage a candidate -
                official voting happens physically on election day.
              </p>
            </div>
          </div>

          {applicants.length === 0 ? (
            <div className="py-12 text-center text-gray-400 font-medium bg-white rounded-3xl border border-gray-100">
              No approved leadership applicants have been published yet. Approved candidates will appear here in the
              category they vie for.
            </div>
          ) : (
            <div className="space-y-8">
              {roles
                .filter((role) => applicants.some((applicant) => applicant.role === role))
                .map((role) => (
                  <div key={role} className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-emerald-600" />
                      <h3 className="text-base font-black text-emerald-950 uppercase tracking-wide">{role}</h3>
                      <span className="text-xs font-bold text-gray-400">
                        {applicants.filter((applicant) => applicant.role === role).length} candidate(s)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {applicants
                        .filter((applicant) => applicant.role === role)
                        .map((applicant) => {
                          const initials = applicant.fullName
                            .split(" ")
                            .map((part) => part[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase();
                          const hasImpressed = !!user?.id && applicant.impressedBy.includes(user.id);
                          const isExpanded = expandedId === applicant._id;

                          return (
                            <div
                              key={applicant._id}
                              className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col shadow-sm hover:border-emerald-300 transition"
                            >
                              <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg font-black border-4 border-emerald-50 shrink-0">
                                  {initials}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-sm font-bold text-gray-900 truncate">{applicant.fullName}</h4>
                                  <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider truncate">
                                    {applicant.role}
                                  </p>
                                  <p className="text-[11px] text-gray-400 font-semibold truncate">
                                    Reg No: {applicant.regNo}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 mt-5">
                                <button
                                  onClick={() => handleImpression(applicant)}
                                  disabled={impressingId === applicant._id}
                                  className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition ${
                                    hasImpressed
                                      ? "bg-emerald-700 border-emerald-700 text-white"
                                      : "bg-white border-gray-200 text-gray-700 hover:border-emerald-300"
                                  }`}
                                >
                                  {impressingId === applicant._id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <ThumbsUp className="h-3.5 w-3.5" />
                                  )}
                                  {applicant.impressions} Impressions
                                </button>
                                <button
                                  onClick={() => setExpandedId(isExpanded ? null : applicant._id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-bold text-gray-700 transition"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-3.5 w-3.5" />
                                  ) : (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  )}
                                  Read More
                                </button>
                              </div>

                              {isExpanded && (
                                <div className="mt-4 space-y-3 border-t border-gray-100 pt-4 text-xs text-gray-600">
                                  <div>
                                    <p className="font-black uppercase tracking-wider text-[10px] text-emerald-700 mb-1">
                                      What Aspires Them
                                    </p>
                                    <p className="whitespace-pre-wrap leading-relaxed">{applicant.motivation}</p>
                                  </div>
                                  <div>
                                    <p className="font-black uppercase tracking-wider text-[10px] text-emerald-700 mb-1">
                                      New Ideas For The Club
                                    </p>
                                    <p className="whitespace-pre-wrap leading-relaxed">{applicant.newIdeas}</p>
                                  </div>
                                  <div>
                                    <p className="font-black uppercase tracking-wider text-[10px] text-emerald-700 mb-1">
                                      Leadership Experience
                                    </p>
                                    <p className="leading-relaxed">
                                      {applicant.heldPositionBefore
                                        ? applicant.previousRole || "Yes (role not specified)"
                                        : "No previous leadership position"}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
