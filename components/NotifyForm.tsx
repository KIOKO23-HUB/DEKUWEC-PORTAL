"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { BellRing, CheckCircle, Loader2 } from "lucide-react";

export default function NotifyForm({
  title = "Get notified",
  description = "Add your email to the member directory and receive broadcast updates by email and in your portal notifications.",
  className = "",
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  const { user, isSignedIn } = useUser();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/public/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "subscribe",
          email: email || user?.primaryEmailAddress?.emailAddress || "",
          fullName: fullName || user?.fullName || "",
          clerkId: user?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Subscription failed.");
      setStatus("done");
      setMessage(data.message || "You're on the list.");
    } catch (error: any) {
      setStatus("error");
      setMessage(error?.message || "Subscription failed.");
    }
  };

  return (
    <div className={`rounded-3xl border border-emerald-200 bg-emerald-50 p-6 ${className}`}>
      <div className="flex items-center gap-2 text-emerald-900">
        <BellRing className="h-5 w-5" />
        <h3 className="text-lg font-black">{title}</h3>
      </div>
      <p className="mt-2 text-sm text-emerald-800/80">{description}</p>

      {status === "done" ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-white p-4 text-sm font-semibold text-emerald-700 border border-emerald-200">
          <CheckCircle className="h-5 w-5" />
          {message}
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name (optional)"
            className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-600"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              required={!isSignedIn}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-600"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-60"
            >
              {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Notify me
            </button>
          </div>
          {status === "error" ? <p className="text-xs font-semibold text-rose-600">{message}</p> : null}
          {isSignedIn ? (
            <p className="text-xs text-emerald-800/70">
              Signed in as {user?.primaryEmailAddress?.emailAddress || user?.fullName}. Leave the email blank to use this account.
            </p>
          ) : null}
        </form>
      )}
    </div>
  );
}
