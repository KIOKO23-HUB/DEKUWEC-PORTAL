"use client";

import { useState, useEffect } from "react";
import { CreditCard, CheckCircle, Shield, Loader2 } from "lucide-react";
import { useUser } from "@clerk/nextjs";

export default function WckCardPage() {
  const { user } = useUser();
  const [submitted, setSubmitted] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: "",
    yearOfStudy: "Year 1",
    phone: "",
    ageBracket: "Below 23 years",
  });

  const userEmail = user?.primaryEmailAddress?.emailAddress || "";

  useEffect(() => {
    setMounted(true);
    const hasApplied = localStorage.getItem("dekuwec_wck_applied");
    if (hasApplied === "true") {
      setSubmitted(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/wck-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          email: userEmail,
        }),
      });

      if (response.ok) {
        localStorage.setItem("dekuwec_wck_applied", "true");
        setSubmitted(true);
      } else {
        alert("Something went wrong. Please try again.");
      }
    } catch (error) {
      console.error("Submission failed", error);
      alert("Failed to submit application.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyAgain = () => {
    localStorage.removeItem("dekuwec_wck_applied");
    setSubmitted(false);
    setFormData({
      fullName: "",
      yearOfStudy: "Year 1",
      phone: "",
      ageBracket: "Below 23 years",
    });
  };

  if (!mounted) return null;

  return (
    <div className="p-8 lg:p-12 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-emerald-950">Wildlife Clubs of Kenya (WCK) Card</h1>
        <p className="text-sm text-gray-500 mt-1">
          Apply for the official student affiliate card to gain free or subsidized access to Kenya Wildlife Service (KWS) national parks and reserves.
        </p>
      </div>

      {submitted ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-10 text-center space-y-5 shadow-sm">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-2">
            <CheckCircle className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-black text-emerald-950">
            Thank you for applying WCK card 🎉
          </h2>
          <p className="text-sm text-emerald-800 max-w-md mx-auto leading-relaxed">
            Your application has been received successfully. Please check your email (<strong>{userEmail}</strong>) and portal notifications for the payment procedure and further instructions.
          </p>
          <div className="pt-4">
            <button
              onClick={handleApplyAgain}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-800 underline underline-offset-4 transition"
            >
              Application not responded? Apply again
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="bg-emerald-900 text-white p-5 rounded-2xl flex items-start gap-4">
            <Shield className="h-6 w-6 text-emerald-300 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-sm text-emerald-200">Application Requirements</p>
              <p className="text-emerald-100 leading-relaxed">
                Fill out your details below. Payment instructions will be sent directly to your registered email and portal notifications upon submission.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Full Official Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Kelvin Maina"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-emerald-600 outline-none transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Year of Study</label>
                <select
                  value={formData.yearOfStudy}
                  onChange={(e) => setFormData({ ...formData, yearOfStudy: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-emerald-600 outline-none transition appearance-none bg-white"
                >
                  <option value="Year 1">Year 1</option>
                  <option value="Year 2">Year 2</option>
                  <option value="Year 3">Year 3</option>
                  <option value="Year 4">Year 4</option>
                  <option value="Year 5">Year 5</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Age Bracket</label>
                <select
                  value={formData.ageBracket}
                  onChange={(e) => setFormData({ ...formData, ageBracket: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-emerald-600 outline-none transition appearance-none bg-white"
                >
                  <option value="Below 23 years">Below 23 years</option>
                  <option value="23 years and above">23 years and above</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number (M-Pesa)</label>
              <input
                type="tel"
                required
                placeholder="07..."
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-emerald-600 outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-sm"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              <span>{isSubmitting ? "Processing..." : "Submit Application"}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
