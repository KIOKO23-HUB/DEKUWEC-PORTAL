"use client";

import { useState, useEffect } from "react";
import { CreditCard, CheckCircle, Shield, Loader2, X, Smartphone, AlertCircle } from "lucide-react";
import { useUser } from "@clerk/nextjs";

export default function WckCardPage() {
  const { user, isLoaded } = useUser();
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingApp, setLoadingApp] = useState(true);
  
  const [existingApp, setExistingApp] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    yearOfStudy: "Year 1",
    phone: "",
    ageBracket: "Below 23 years",
  });

  // Dynamic Payment States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<"ask_pay" | "checkout" | "polling" | "success">("ask_pay");
  const [paymentPhone, setPaymentPhone] = useState("");
  
  // NEW: Dynamic fee configuration 
  // Age-based pricing: Under 23 = 100, Over 23 = 230
  const [feeConfig, setFeeConfig] = useState({ wck1: 200, wck2: 350, wck4: 600 });
  const [selectedFeeAmount, setSelectedFeeAmount] = useState<number>(100);
  const [paymentAmount, setPaymentAmount] = useState<number>(100);
  const [paymentBalance, setPaymentBalance] = useState<number | null>(null);

  const userEmail = user?.primaryEmailAddress?.emailAddress || "";

  useEffect(() => {
    setMounted(true);
    if (user) {
      setFormData(prev => ({ ...prev, fullName: user.fullName || "" }));
      Promise.all([
        fetch(`/api/wck-card?clerkId=${user.id}`).then(res => res.json()),
        fetch("/api/admin/fees").then(res => res.ok ? res.json() : null)
      ]).then(([applicationData, feeData]) => {
        const application = applicationData?.application;
        if (application) {
          setExistingApp(application);
          setPaymentPhone(application.phone);
        }
        const isOver23 = application?.ageBracket === "23 years and above" || formData.ageBracket === "23 years and above";
        const configuredAmount = isOver23 ? feeData?.wckOver23 : feeData?.wckUnder23;
        if (configuredAmount) {
          setSelectedFeeAmount(Number(configuredAmount));
          setPaymentAmount(Number(configuredAmount));
        }
      }).catch(err => console.error(err)).finally(() => setLoadingApp(false));
    }
  }, [user]);

  // Adjust fee instantly when the age bracket dropdown changes
  const handleAgeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const age = e.target.value;
    setFormData({ ...formData, ageBracket: age });
    if (age === "23 years and above") {
      setSelectedFeeAmount(230);
      setPaymentAmount(230);
    } else {
      setSelectedFeeAmount(100);
      setPaymentAmount(100);
    }
  };

  // Step 1: Submit Application
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/wck-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          email: userEmail,
          clerkId: user.id
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setExistingApp(data.application);
        setPaymentPhone(formData.phone);
        setModalStep("ask_pay");
        setIsModalOpen(true);
      } else {
        alert(data.error || "Something went wrong. Please try again.");
      }
    } catch (error) {
      alert("Failed to submit application.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Trigger M-Pesa (Real STK Push + Polling)
  const handleInitiatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!paymentPhone) return alert("Please enter your M-Pesa phone number.");

    setModalStep("polling"); // Switch UI to polling spinner immediately

    try {
      // 1. Trigger the STK Push to the user's phone via backend
      const pushRes = await fetch("/api/mpesa/stkpush", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: user?.id,
          fullName: user?.fullName || "Member",
          phone: paymentPhone,
          amount: paymentAmount,
          totalDue: selectedFeeAmount,
          category: "WCK Card Application",
          reference: "WCK Card",
          targetId: existingApp?._id
        })
      });

      const pushData = await pushRes.json();

      if (!pushRes.ok) {
        alert(`M-Pesa Error: ${pushData.error}`);
        setModalStep("checkout");
        return;
      }

      // 2. Start Polling the Database for "Completed" Status
      const paymentId = pushData.paymentId;
      let attempts = 0;
      const maxAttempts = 30; // Stop checking after 60 seconds (30 attempts * 2s)

      const pollInterval = setInterval(async () => {
        attempts++;
        
        try {
          const statusRes = await fetch(`/api/mpesa/status?id=${paymentId}`);
          const statusData = await statusRes.json();

          if (statusData.status === "Completed") {
            clearInterval(pollInterval);
            setPaymentBalance(statusData.balance ?? 0);
            
            // Mark the local state as paid to update the UI instantly
            setExistingApp((prev: any) => ({ ...prev, paymentStatus: "Paid" }));
            setModalStep("success");
            
            // Auto-close modal after 3 seconds
            setTimeout(() => {
              setIsModalOpen(false);
            }, 3000);
            
          } else if (statusData.status === "Failed" || attempts >= maxAttempts) {
            clearInterval(pollInterval);
            alert("Payment failed or timed out. Please check your funds and try again.");
            setModalStep("checkout");
          }
        } catch (pollErr) {
          console.error("Polling error", pollErr);
        }
      }, 2000); // Check every 2 seconds

    } catch (error) {
      console.error("Payment submission error:", error);
      alert("Server connection failed.");
      setModalStep("checkout");
    }
  };

  if (!mounted || !isLoaded || loadingApp) {
    return <div className="flex justify-center items-center h-[60vh]"><Loader2 className="h-8 w-8 text-emerald-600 animate-spin" /></div>;
  }

  return (
    <div className="p-8 lg:p-12 max-w-3xl mx-auto space-y-8 font-sans relative">
      <div>
        <h1 className="text-3xl font-black text-emerald-950">Wildlife Clubs of Kenya (WCK) Card</h1>
        <p className="text-sm text-gray-500 mt-1">
          Apply for the official student affiliate card to gain free or subsidized access to Kenya Wildlife Service (KWS) national parks and reserves.
        </p>
      </div>

      {existingApp ? (
        <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-4 gap-4">
            <h2 className="text-xl font-black text-gray-900">Your Application Status</h2>
            <span className={`px-4 py-1.5 rounded-full text-xs font-bold text-center ${
              existingApp.paymentStatus === "Paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
            }`}>
              {existingApp.paymentStatus === "Paid" ? "Paid & In Processing" : "Applied (Not Yet Paid)"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-400 font-bold uppercase mb-1">Applicant Name</p>
              <p className="font-bold text-gray-900">{existingApp.fullName}</p>
            </div>
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-400 font-bold uppercase mb-1">Status</p>
              <p className="font-bold text-gray-900">{existingApp.paymentStatus}</p>
            </div>
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 sm:col-span-2">
              <p className="text-xs text-gray-400 font-bold uppercase mb-1">Contact Phone</p>
              <p className="font-bold text-gray-900">{existingApp.phone}</p>
            </div>
          </div>

          {existingApp.paymentStatus === "Paid" ? (
            <div className="space-y-4">
              <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-emerald-900 font-bold">Payment Verified</p>
                  <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                    Your payment was received successfully. Your card is currently being processed by the club executive. You will be notified via email when it is ready!
                  </p>
                </div>
              </div>
              
              {/* Fallback button for payment errors/retries */}
              <button
                onClick={() => {
                  setPaymentPhone(existingApp.phone);
                  setModalStep("checkout");
                  setIsModalOpen(true);
                }}
                className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-3 px-6 rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-2"
              >
                <AlertCircle className="h-4 w-4" /> Did your payment fail or delay? Retry Payment Here
              </button>
            </div>
          ) : (
            <div className="pt-2">
              <button
                onClick={() => {
                  setPaymentPhone(existingApp.phone);
                  setModalStep("checkout");
                  setIsModalOpen(true);
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-xl text-sm transition shadow-sm flex items-center justify-center gap-2"
              >
                <CreditCard className="h-4 w-4" /> Pay via M-Pesa Now
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="bg-emerald-900 text-white p-5 rounded-2xl flex items-start gap-4">
            <Shield className="h-6 w-6 text-emerald-300 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-sm text-emerald-200">Application Requirements</p>
              <p className="text-emerald-100 leading-relaxed">
                Fill out your details below. You can complete the card fee securely via M-Pesa immediately after submitting your details. WCK membership fees are strictly KES 100 for members below 23 years, and KES 230 for 23 years and above.
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
                  onChange={handleAgeChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-emerald-600 outline-none transition appearance-none bg-white"
                >
                  <option value="Below 23 years">Below 23 years (KES 100)</option>
                  <option value="23 years and above">23 years and above (KES 230)</option>
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

      {/* MULTI-STAGE M-PESA CHECKOUT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition"
            >
              <X className="h-5 w-5" />
            </button>

            {/* STAGE 1: Congratulate & Ask Payment */}
            {modalStep === "ask_pay" && (
              <div className="text-center space-y-6 py-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-emerald-950">Application Logged! 🎉</h3>
                  <p className="text-sm text-gray-600 mt-2">
                    Your details for the WCK Card have been recorded successfully.
                  </p>
                  <p className="text-sm font-bold text-emerald-800 mt-4">Do you want to complete your payment now?</p>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => setModalStep("checkout")}
                    className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition"
                  >
                    Next: Proceed to Pay
                  </button>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="w-full py-3.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition"
                  >
                    I'll Pay Later
                  </button>
                </div>
              </div>
            )}

            {/* STAGE 2: Confirm M-Pesa Phone & Push */}
            {modalStep === "checkout" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-black text-emerald-950">M-Pesa Checkout</h3>
                  <p className="text-xs text-gray-500 mt-1">Confirm fee and M-Pesa phone number for the STK Prompt.</p>
                </div>

                <form onSubmit={handleInitiatePayment} className="space-y-4">
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
                    <span className="text-[10px] text-gray-400 mt-1 block">Pre-filled with your registration contact. You may modify it to another number to pay.</span>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-md mt-2"
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>Send M-Pesa Prompt</span>
                  </button>
                </form>
              </div>
            )}

            {/* STAGE 3: Waiting for M-Pesa PIN */}
            {modalStep === "polling" && (
              <div className="text-center space-y-5 py-8">
                <Smartphone className="h-12 w-12 text-emerald-600 animate-pulse mx-auto" />
                <h3 className="text-lg font-black text-emerald-950">Check your phone!</h3>
                <p className="text-sm text-gray-500 px-4">
                  An M-Pesa prompt has been sent to <strong>{paymentPhone}</strong>. Enter your PIN to finalize.
                </p>
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-600 mt-4">
                  <Loader2 className="h-4 w-4 animate-spin" /> Verifying payment with Safaricom...
                </div>
              </div>
            )}

            {/* STAGE 4: Success */}
            {modalStep === "success" && (
              <div className="text-center space-y-4 py-6">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-black text-emerald-950">Payment Completed!</h3>
                <p className="text-sm text-gray-500">Payment received. Your remaining balance is {paymentBalance ?? "being calculated"}.</p>
                <button onClick={() => { setPaymentAmount(paymentBalance || selectedFeeAmount); setModalStep("checkout"); }} className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm">Pay Full Balance Again</button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
