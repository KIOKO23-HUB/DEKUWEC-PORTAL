"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { 
  ShoppingBag, CheckCircle, Clock, Smartphone, CreditCard, 
  Loader2, X, AlertCircle, Sparkles, MapPin, Calendar, Tag
} from "lucide-react";

export default function MerchandisePage() {
  const { user, isLoaded } = useUser();
  const [items, setItems] = useState<any[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [customName, setCustomName] = useState("");
  const [selectedSize, setSelectedSize] = useState("M");
  const [paymentPhone, setPaymentPhone] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<"customize" | "ask_pay" | "checkout" | "polling" | "success">("customize");
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [currentAmount, setCurrentAmount] = useState<number>(0);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentBalance, setPaymentBalance] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      fetch(`/api/merchandise?clerkId=${user.id}`)
        .then((res) => res.json())
        .then((data) => {
          setItems(data.items || []);
          setMyOrders(data.myOrders || []);
        })
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [user]);

  const openOrderFlow = (item: any) => {
    setSelectedItem(item);
    setCurrentAmount(item.price);
    setPaymentAmount(item.price);
    setCustomName((user?.firstName || "").toUpperCase());
    setSelectedSize(item.availableSizes?.[0] || "M");
    setPaymentPhone("");
    setModalStep(item.allowCustomName ? "customize" : "ask_pay");
    setIsModalOpen(true);
  };

  const handleCreateOrder = async (payLater: boolean = false) => {
    if (!user || !selectedItem) return;
    setLoading(true);

    try {
      const res = await fetch("/api/merchandise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: user.id,
          fullName: user.fullName || "Member",
          email: user.primaryEmailAddress?.emailAddress || "",
          phone: paymentPhone || "07XXXXXXXX",
          merchandiseId: selectedItem._id,
          merchandiseTitle: selectedItem.title,
          imageUrl: selectedItem.imageUrl,
          amount: currentAmount,
          size: selectedSize,
          customName: selectedItem.allowCustomName ? customName.trim() : "",
          payLater
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMyOrders((prev) => [data.order, ...prev]);
        setCurrentOrderId(data.order._id);
        if (payLater) {
          setModalStep("success");
        } else {
          setModalStep("checkout");
        }
      } else {
        alert(data.error || "Order failed.");
      }
    } catch {
      alert("Network error.");
    } finally {
      setLoading(false);
    }
  };

  const handleInitiateMpesa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentPhone) return alert("Enter M-Pesa Phone Number.");
    setModalStep("polling");

    try {
      const pushRes = await fetch("/api/mpesa/stkpush", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: user?.id,
          fullName: user?.fullName || "Member",
          phone: paymentPhone,
          amount: paymentAmount,
          totalDue: currentAmount,
          targetId: currentOrderId,
          category: "Club Merchandise",
          reference: selectedItem?.title?.slice(0, 12) || "Merchandise"
        })
      });

      const pushData = await pushRes.json();
      if (!pushRes.ok) {
        alert(`M-Pesa Error: ${pushData.error}`);
        setModalStep("checkout");
        return;
      }

      const paymentId = pushData.paymentId;
      let attempts = 0;
      const maxAttempts = 30;

      const pollInterval = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await fetch(`/api/mpesa/status?id=${paymentId}`);
          const statusData = await statusRes.json();

          if (statusData.status === "Completed") {
            clearInterval(pollInterval);
            setPaymentBalance(statusData.balance ?? 0);
            setMyOrders((prev) =>
              prev.map((o) => (o._id === currentOrderId ? { ...o, paymentStatus: "Paid" } : o))
            );
            setModalStep("success");
          } else if (statusData.status === "Failed" || attempts >= maxAttempts) {
            clearInterval(pollInterval);
            alert("Payment failed or timed out. You can retry later from your orders list.");
            setModalStep("checkout");
          }
        } catch (err) {
          console.error(err);
        }
      }, 2000);
    } catch {
      alert("Payment initiation failed.");
      setModalStep("checkout");
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 lg:p-12 max-w-7xl mx-auto space-y-12 font-sans">
      <div className="border-b border-gray-200 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-emerald-950">Official Club Merchandise</h1>
        </div>
        <p className="text-sm text-gray-500 max-w-2xl">
          Order authentic DEKUWEC gear, personalized t-shirts, and accessories. Collection is scheduled during our weekly Wednesday physical gathering exactly one week after confirmation.
        </p>
      </div>

      {/* Product Catalog Grid */}
      <section className="space-y-6">
        <h2 className="text-2xl font-black text-emerald-950">Available Merch</h2>
        {items.length === 0 ? (
          <div className="p-12 text-center bg-gray-50 border border-dashed border-gray-200 rounded-3xl text-gray-400">
            No merchandise released yet. Check back soon!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <div key={item._id} className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition flex flex-col">
                <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                  <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover hover:scale-105 transition duration-500" />
                  {item.allowCustomName && (
                    <span className="absolute top-4 left-4 bg-emerald-700 text-white text-[10px] uppercase tracking-wider font-extrabold px-3 py-1.5 rounded-full shadow">
                      Personalizable Name
                    </span>
                  )}
                </div>

                <div className="p-6 flex flex-col flex-1 justify-between space-y-4">
                  <div>
                    <div className="flex justify-between items-baseline gap-2 mb-1">
                      <h3 className="font-bold text-lg text-gray-900 leading-snug">{item.title}</h3>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{item.description}</p>
                  </div>

                  <button
                    onClick={() => openOrderFlow(item)}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition shadow-sm flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="h-4 w-4" /> Order Item
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Orders Tracking Section */}
      <section className="space-y-6">
        <h2 className="text-2xl font-black text-emerald-950">Your Merch Orders</h2>
        {myOrders.length === 0 ? (
          <p className="text-xs text-gray-400">You have no merchandise orders placed yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myOrders.map((order) => (
              <div key={order._id} className="p-5 bg-white border border-gray-200 rounded-2xl flex gap-4 items-center shadow-sm">
                <img src={order.imageUrl} alt={order.merchandiseTitle} className="w-20 h-20 rounded-xl object-cover bg-gray-100 shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-gray-900 truncate">{order.merchandiseTitle}</h4>
                  <p className="text-xs text-gray-500">
                    Size: <strong>{order.size}</strong> {order.customName && `• Custom Name: "${order.customName}"`}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      order.paymentStatus === "Paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    }`}>
                      {order.paymentStatus}
                    </span>
                    <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {order.collectionStatus}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ORDER & CUSTOMIZATION MODAL */}
      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 rounded-full"
            >
              <X className="h-5 w-5" />
            </button>

            {/* STAGE 1: Customization (Visual T-Shirt Name Simulation) */}
            {modalStep === "customize" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-black text-emerald-950">Personalize Your Gear</h3>
                  <p className="text-xs text-gray-500 mt-1">Preview how your printed name will appear on the shirt.</p>
                </div>

                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-900 flex items-center justify-center border border-gray-200">
                  <img src={selectedItem.imageUrl} alt="T-Shirt" className="w-full h-full object-contain opacity-90" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4">
                    <div className="bg-black/60 backdrop-blur-md px-6 py-2 rounded-xl border border-white/20 text-center shadow-2xl">
                      <span className="text-[10px] uppercase text-emerald-300 font-extrabold tracking-widest block">FRONT PRINT PREVIEW</span>
                      <span className="text-xl font-black tracking-widest text-white uppercase drop-shadow-md">
                        {customName.trim() || "YOUR NAME"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Custom Name to Print</label>
                    <input
                      type="text"
                      maxLength={15}
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value.toUpperCase())}
                      placeholder="e.g. KIOKO"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 font-bold uppercase tracking-wider text-sm outline-none focus:border-emerald-600"
                    />
                    <span className="text-[10px] text-gray-400 mt-1 block">Max 15 characters. One name recommended for optimal clarity.</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Select Size</label>
                    <div className="flex gap-3">
                      {(selectedItem.availableSizes || ["S", "M", "L", "XL"]).map((sz: string) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setSelectedSize(sz)}
                          className={`flex-1 py-2.5 rounded-xl font-bold text-xs border transition ${
                            selectedSize === sz
                              ? "bg-emerald-600 text-white border-emerald-600 shadow"
                              : "border-gray-200 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setModalStep("ask_pay")}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition shadow-md"
                >
                  Continue to Confirmation
                </button>
              </div>
            )}

            {/* STAGE 2: Choose Pay Now vs Pay Later */}
            {modalStep === "ask_pay" && (
              <div className="space-y-6 text-center py-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                  <Sparkles className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-emerald-950">{selectedItem.title}</h3>
                  <p className="text-xs text-gray-500 mt-2 px-4">
                    Do you want to complete payment via M-Pesa immediately, or log your order now and pay later?
                  </p>
                </div>

                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl text-left text-xs text-emerald-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Calendar className="h-3.5 w-3.5" /> Collection Timeline
                  </div>
                  <p className="text-[11px] text-emerald-800/80 leading-relaxed">
                    Orders ready for physical collection during our weekly Wednesday physical club gatherings exactly one week after payment confirmation.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => handleCreateOrder(false)}
                    className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition shadow-sm flex items-center justify-center gap-2"
                  >
                    <CreditCard className="h-4 w-4" /> Pay Now via M-Pesa
                  </button>
                  <button
                    onClick={() => handleCreateOrder(true)}
                    className="w-full py-3.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition"
                  >
                    Apply & Pay Later
                  </button>
                </div>
              </div>
            )}

            {/* STAGE 3: M-Pesa Checkout */}
            {modalStep === "checkout" && (
              <form onSubmit={handleInitiateMpesa} className="space-y-5">
                <div>
                  <h3 className="text-xl font-black text-emerald-950">M-Pesa STK Push</h3>
                  <p className="text-xs text-gray-500 mt-1">Confirm your phone number to receive the prompt.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Amount to pay</label>
                  <input type="number" min="1" required value={paymentAmount} onChange={(e) => setPaymentAmount(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold outline-none focus:border-emerald-600" />
                  <span className="text-[10px] text-gray-400 mt-1 block">Pay an installment now or enter the full remaining balance.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">M-Pesa Phone Number</label>
                  <div className="relative">
                    <Smartphone className="h-4 w-4 text-gray-400 absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      required
                      placeholder="07XXXXXXXX"
                      value={paymentPhone}
                      onChange={(e) => setPaymentPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-md"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Send M-Pesa Prompt</span>
                </button>
              </form>
            )}

            {/* STAGE 4: Polling */}
            {modalStep === "polling" && (
              <div className="text-center space-y-5 py-8">
                <Smartphone className="h-12 w-12 text-emerald-600 animate-pulse mx-auto" />
                <h3 className="text-lg font-black text-emerald-950">Check your phone!</h3>
                <p className="text-sm text-gray-500 px-4">
                  Prompt sent to <strong>{paymentPhone}</strong>. Enter your M-Pesa PIN to finalize.
                </p>
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-600">
                  <Loader2 className="h-4 w-4 animate-spin" /> Verifying with Safaricom...
                </div>
              </div>
            )}

            {/* STAGE 5: Success & Congratulations Message */}
            {modalStep === "success" && (
              <div className="text-center space-y-5 py-6">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-emerald-950">Congratulations! 🎉</h3>
                  <p className="text-sm text-gray-600 mt-1">Your order for <strong>{selectedItem.title}</strong> has been confirmed.</p>
                  <p className="text-sm text-gray-600">Remaining balance: {paymentBalance ?? "being calculated"}.</p>
                </div>

                <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl text-left text-xs text-gray-600 space-y-1">
                  <p className="font-bold text-gray-900">📦 Collection Instructions:</p>
                  <p>Collection is held during our weekly Wednesday physical club meeting (5:00 PM – 6:45 PM) exactly one week after payment.</p>
                </div>

                <button onClick={() => { setPaymentAmount(paymentBalance || currentAmount); setModalStep("checkout"); }} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm">
                  Pay Full Balance Again
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}