"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  ShoppingBag, Loader2, X, CheckCircle, MapPin, Tag, Sparkles, CreditCard, Share2,
} from "lucide-react";
import PublicPageShell from "@/components/PublicPageShell";
import NotifyForm from "@/components/NotifyForm";
import GoogleContinueButton from "@/components/GoogleContinueButton";
import { optimizedImage } from "@/lib/image";
import { normalizeSizes } from "@/lib/merchandise";

type Item = {
  _id: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  allowCustomName?: boolean;
  availableSizes?: string[];
};

export default function MerchandiseClient() {
  const { user } = useUser();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Item | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    size: "M",
    color: "",
    customName: "",
  });

  useEffect(() => {
    fetch("/api/public/merchandise", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setItems(Array.isArray(data.items) ? data.items : []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      fullName: prev.fullName || user.fullName || "",
      email: prev.email || user.primaryEmailAddress?.emailAddress || "",
    }));
  }, [user]);

  // Deep link support: /merchandise?item=<id>
  useEffect(() => {
    if (loading) return;
    const id = new URLSearchParams(window.location.search).get("item");
    if (!id) return;
    const match = items.find((item) => item._id === id);
    if (match) openOrder(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, items]);

  const shareItem = async (item: Item) => {
    const url = `${window.location.origin}/merchandise?item=${item._id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: item.title, text: `${item.title} — DEKUWEC merchandise`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopiedId(item._id);
      setTimeout(() => setCopiedId(""), 2500);
    } catch {
      // User dismissed the share sheet.
    }
  };

  const openOrder = (item: Item) => {
    setSelected(item);
    setDone("");
    setError("");
    setForm((prev) => ({
      ...prev,
      size: item.availableSizes?.[0] || "M",
      color: item.category === "tshirt" ? "Green" : "",
      customName: item.allowCustomName ? (user?.firstName || "").toUpperCase() : "",
    }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/public/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "merchandise",
          clerkId: user?.id,
          merchandiseId: selected._id,
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          size: form.size,
          color: form.color,
          customName: form.customName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Order failed.");
      setDone(data.message || "Order received. Check your email for the receipt.");
    } catch (err: any) {
      setError(err?.message || "Order failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PublicPageShell active="merchandise">
      <section className="rounded-3xl bg-gradient-to-br from-emerald-800 to-emerald-950 p-6 text-white shadow-xl sm:p-10">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider">
          <ShoppingBag className="h-3.5 w-3.5" /> Official Club Gear
        </span>
        <h1 className="mt-4 text-3xl font-black sm:text-5xl">Wear the green movement.</h1>
        <p className="mt-3 max-w-2xl text-sm text-emerald-100 sm:text-base">
          Apply for official DEKUWEC merchandise below. Your email is added to the member directory so you
          receive order updates, broadcast announcements and pickup reminders.
        </p>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section>
          <h2 className="text-2xl font-black text-emerald-950">Available merchandise</h2>
          <p className="text-sm text-gray-500">Prices in KES. Pickup after payment verification.</p>

          {loading ? (
            <div className="mt-8 flex justify-center py-16">
              <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
            </div>
          ) : items.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-emerald-200 bg-white p-10 text-center">
              <ShoppingBag className="mx-auto h-10 w-10 text-emerald-300" />
              <p className="mt-3 text-sm font-semibold text-gray-500">
                New merchandise is dropping soon. Add your email to be notified first.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {items.map((item) => (
                <article key={item._id} className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-emerald-100">
                  <div className="aspect-square overflow-hidden bg-emerald-50">
                    <img src={optimizedImage(item.imageUrl, 600)} alt={item.title} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-black text-emerald-950">{item.title}</h3>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                        <Tag className="h-3 w-3" /> KES {item.price.toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">{item.description}</p>
                    <button
                      type="button"
                      onClick={() => openOrder(item)}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
                    >
                      <ShoppingBag className="h-4 w-4" /> Apply / Order
                    </button>
                    <button
                      type="button"
                      onClick={() => shareItem(item)}
                      className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 px-4 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      {copiedId === item._id ? "Link copied" : "Share this item"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="space-y-6">
          <NotifyForm
            title="Merch drop alerts"
            description="Be first to know when new gear lands. Your email joins the DEKUWEC member directory and broadcast list."
          />
          <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-emerald-900">
              <MapPin className="h-4 w-4" /> Pickup
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Collect at the weekly physical Wednesday meeting (5:00 PM – 6:45 PM) exactly one week after
              payment verification.
            </p>
          </div>
        </div>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setSelected(null)}>
          <div
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-black text-emerald-950">{selected.title}</h3>
                <p className="text-sm font-bold text-emerald-700">KES {selected.price.toLocaleString()}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="rounded-full p-2 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {done ? (
              <div className="mt-6 space-y-4 text-center">
                <CheckCircle className="mx-auto h-12 w-12 text-emerald-600" />
                <p className="text-sm font-semibold text-emerald-900">{done}</p>
                <p className="text-xs text-gray-500">
                  You are now in the DEKUWEC member directory and will receive broadcast notifications by email.
                </p>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800"
                >
                  Done
                </button>
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

                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={form.size}
                    onChange={(event) => setForm({ ...form, size: event.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-600"
                  >
                    {normalizeSizes(selected).map((size) => (
                      <option key={size} value={size}>
                        Size {size}
                      </option>
                    ))}
                  </select>
                  <input
                    value={form.color}
                    onChange={(event) => setForm({ ...form, color: event.target.value })}
                    placeholder="Colour (optional)"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-600"
                  />
                </div>

                {selected.allowCustomName ? (
                  <input
                    value={form.customName}
                    onChange={(event) => setForm({ ...form, customName: event.target.value })}
                    placeholder="Name printed on the item"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-600"
                  />
                ) : null}

                {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                  Submit application
                </button>

                {!user ? (
                  <div className="rounded-2xl bg-emerald-50 p-4 text-center">
                    <p className="text-xs text-emerald-800">
                      Want this order saved to a portal profile? Sign in with Google — no OTP.
                    </p>
                    <div className="mt-3 flex justify-center">
                      <GoogleContinueButton label="Continue with Google" className="!py-2 !text-xs" />
                    </div>
                  </div>
                ) : (
                  <p className="flex items-center justify-center gap-1 text-xs text-gray-500">
                    <Sparkles className="h-3.5 w-3.5" /> Saved to your profile as {user.fullName || user.username}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      ) : null}
    </PublicPageShell>
  );
}
