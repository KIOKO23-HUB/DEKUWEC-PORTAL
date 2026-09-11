"use client";

import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation"; 
import { 
  Users, CheckCircle2, Search, MessageSquare, 
  UserCheck, Send, X, AlertCircle, Loader2,
  Smartphone, CreditCard, CheckCircle
} from "lucide-react";

const rosterMembers = [
  "Edith Asachita", "Neema Kimutai", "Trecy Kipchoge", "Orville Awour",
  "Margaret Karongo", "Samuel Ndicu", "Phillip Theuri", "Mercy Njoki",
  "Joyline Selim", "Babra Cherop", "Clinton Kiptoo", "Charles Nderitu",
  "Amanda Matata", "Lincoln Mureithi", "Daniel Smith", "John Muchai",
  "Claire Njeri", "Sophia Kinyua", "Elijah Isaac", "Kelvin Maina",
  "Michael Kiborom", "Victor Mbau", "Manasse koech", "Curtis kioko",
  "Hannah Macharia", "Keith Bundi", "Victoria Cherotich", "Eoudiah Kiptoon",
  "Elizabeth Nduli", "Harrison Kimwaki", "George kimani", "Hazeline okendo",
  "John Wamui", "Emmanuel Muron", "Patricia Lenanyangera", "Bonface Njogu",
  "Nedi kavwaiza", "Zac", "Abigael Chebet", "Ian Wambua",
  "Peter Komen", "Grace Chebet", "Andrew Sawe", "Elijah mutua",
  "Robert Nderitu", "Mercy mutheu", "Winnie njeri", "Regina",
  "Annabel Odege", "Leonidah kiboror", "Lewis Njuguna", "Bett Kimutai",
  "Jael Oketch", "Elvis Muyai", "Maureen Chepngeno", "Leonidas Mbogo",
  "Titus kibos", "Hezron Pkemoi", "Felistas kome", "Lodio josephat",
  "Celestine kiptoo", "Tom alando", "Lennis gitau"
];

export default function MembershipPortalPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [isRegisteredAnswer, setIsRegisteredAnswer] = useState<"yes" | "no" | null>(null);
  const [wantsToRegister, setWantsToRegister] = useState<boolean | null>(null);
  const [selectedRosterName, setSelectedRosterName] = useState("");
  const [rosterSearch, setRosterSearch] = useState("");
  const [directorySearch, setDirectorySearch] = useState("");
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [directoryMembers, setDirectoryMembers] = useState<any[]>([]);
  const [isFetchingDirectory, setIsFetchingDirectory] = useState(true);

  const [regForm, setRegForm] = useState({
    name: user?.fullName || "",
    email: user?.primaryEmailAddress?.emailAddress || "",
    phone: "",
    year: "Year 1",
  });

  // Payment Modal States for New Registration
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentStep, setPaymentStep] = useState<"ask_pay" | "checkout">("ask_pay");
  const [paymentPhone, setPaymentPhone] = useState("");
  
  // NEW: Dynamic Fee Configuration (Controlled by Admin Portal)
  const [feeConfig, setFeeConfig] = useState({ member: 100 });
  const membershipFee = feeConfig.member;

  const [messagingTarget, setMessagingTarget] = useState<any>(null);
  const [messageText, setMessageText] = useState("");
  
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [isFetchingChat, setIsFetchingChat] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchDirectoryAndFees = async () => {
      try {
        const res = await fetch("/api/directory");
        if (res.ok) {
          const data = await res.json();
          setDirectoryMembers(data);
        }
      } catch (error) {
        console.error("Failed to fetch directory", error);
      } finally {
        setIsFetchingDirectory(false);
      }

      // Fetch dynamic fee structures set by Admin
      try {
        const feeRes = await fetch("/api/admin/fees");
        if (feeRes.ok) {
          const feeData = await feeRes.json();
          if (feeData && feeData.member) {
            setFeeConfig({ member: feeData.member });
          }
        }
      } catch (error) {
        console.log("Using fallback default fee structures.");
      }
    };

    if (isLoaded) fetchDirectoryAndFees();
  }, [isLoaded]);

  useEffect(() => {
    const fetchChatHistory = async () => {
      if (!messagingTarget || !user) return;
      setIsFetchingChat(true);
      try {
        const res = await fetch(`/api/messages?user1=${user.id}&user2=${messagingTarget.clerkId}`);
        if (res.ok) {
          const data = await res.json();
          setChatHistory(data.messages || []);
        }
      } catch (error) {
        console.error("Failed to load chat history", error);
      } finally {
        setIsFetchingChat(false);
      }
    };
    fetchChatHistory();
  }, [messagingTarget, user]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleClaimRoster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRosterName || !user) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "claim",
          clerkId: user.id,
          fullName: user.fullName || "DEKUWEC Member",
          email: user.primaryEmailAddress?.emailAddress,
          claimedRosterName: selectedRosterName,
        }),
      });
      if (res.ok) setStatusNotice(`Thanks for confirming your registration as "${selectedRosterName}". Your record is pending admin approval.`);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "register",
          clerkId: user.id,
          fullName: regForm.name,
          email: regForm.email,
          phone: regForm.phone,
          yearOfStudy: regForm.year,
        }),
      });
      
      if (res.ok) {
        // Trigger the payment flow instead of just setting status notice
        setPaymentPhone(regForm.phone);
        setPaymentStep("ask_pay");
        setIsPaymentModalOpen(true);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to submit registration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Simulated Payment Trigger (MAINTENANCE MODE)
  const handleInitiatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Payment system is currently under maintenance. We will continue once the Safaricom Daraja API is applied.");
    setPaymentStep("ask_pay");
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !user || !messagingTarget) return;
    
    const tempMessage = {
      _id: Date.now().toString(),
      senderId: user.id,
      content: messageText,
      createdAt: new Date().toISOString()
    };
    setChatHistory((prev) => [...prev, tempMessage]);
    setMessageText("");

    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: user.id,
          senderName: user.fullName || "Member",
          receiverId: messagingTarget.clerkId, 
          receiverName: messagingTarget.fullName,
          content: tempMessage.content, 
        }),
      });
    } catch (error) {
      console.error("Failed to route message:", error);
    }
  };

  const filteredRoster = rosterMembers.filter((name) =>
    name.toLowerCase().includes(rosterSearch.toLowerCase())
  );

  const filteredDirectory = directoryMembers.filter((member) =>
    (member.fullName || "").toLowerCase().includes(directorySearch.toLowerCase())
  );

  if (!isLoaded) return null;

  return (
    <div className="p-6 sm:p-8 lg:p-12 max-w-7xl mx-auto space-y-10 font-sans relative">
      <div className="border-b border-gray-200 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
            <Users className="h-6 w-6" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-emerald-950">Membership Portal</h1>
        </div>
        <p className="text-sm text-gray-600 max-w-3xl">
          Confirm your club affiliation, register as a new member, and connect with fellow conservationists in our student directory.
        </p>
      </div>

      <section className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-10 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <UserCheck className="h-5 w-5 text-emerald-700" />
          <h2 className="text-xl font-bold text-gray-900">Membership Status Verification</h2>
        </div>

        {statusNotice ? (
          <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-emerald-950">Submission Acknowledged</h3>
                <p className="text-sm text-emerald-800 mt-1 leading-relaxed">{statusNotice}</p>
              </div>
            </div>

            {/* NEW: Fallback button for payment errors/retries */}
            <div className="pt-2">
              <button
                onClick={() => {
                  setPaymentStep("checkout");
                  setIsPaymentModalOpen(true);
                }}
                className="w-full sm:w-auto bg-white border border-gray-200 hover:bg-gray-50 text-emerald-700 font-bold py-3 px-6 rounded-xl text-sm transition shadow-sm flex items-center justify-center gap-2 mb-2"
              >
                <AlertCircle className="h-4 w-4" /> Did your payment fail or delay? Retry Payment Here
              </button>
            </div>

            <button
              onClick={() => {
                setStatusNotice(null);
                setIsRegisteredAnswer(null);
                setWantsToRegister(null);
                setSelectedRosterName("");
              }}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline underline-offset-4"
            >
              Reset status verification
            </button>
          </div>
        ) : isRegisteredAnswer === null ? (
          <div className="space-y-4">
            <p className="text-base font-semibold text-gray-800">Are you an existing registered DEKUWEC member?</p>
            <div className="flex flex-wrap gap-4">
              <button onClick={() => setIsRegisteredAnswer("yes")} className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-sm">Yes, I am registered</button>
              <button onClick={() => setIsRegisteredAnswer("no")} className="px-6 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-bold">No, I am not registered</button>
            </div>
          </div>
        ) : isRegisteredAnswer === "yes" ? (
          <form onSubmit={handleClaimRoster} className="space-y-5 max-w-xl">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Select Your Name</label>
              <div className="relative mb-3">
                <Search className="h-4 w-4 text-gray-400 absolute left-3.5 top-3" />
                <input type="text" placeholder="Filter roster names..." value={rosterSearch} onChange={(e) => setRosterSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm border rounded-xl border-gray-200 outline-none focus:border-emerald-600" />
              </div>
              <select size={6} required value={selectedRosterName} onChange={(e) => setSelectedRosterName(e.target.value)} className="w-full p-2 border rounded-xl border-gray-200 text-sm focus:border-emerald-600 outline-none bg-white">
                {filteredRoster.map((name, idx) => (<option key={idx} value={name} className="p-2 hover:bg-emerald-50 rounded">{name}</option>))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={!selectedRosterName || isSubmitting} className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm disabled:opacity-50 flex items-center gap-2">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Identity & Submit"}
              </button>
              <button type="button" onClick={() => setIsRegisteredAnswer(null)} className="px-4 py-3 rounded-xl text-gray-500 hover:text-gray-800 text-sm font-semibold">Back</button>
            </div>
          </form>
        ) : wantsToRegister === null ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-amber-800 bg-amber-50 p-4 rounded-xl border border-amber-200">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">You are currently not listed as a registered member.</p>
            </div>
            <p className="text-base font-semibold text-gray-800">Do you want to register as a new DEKUWEC member?</p>
            <div className="flex flex-wrap gap-4">
              <button onClick={() => setWantsToRegister(true)} className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold">Yes, Register Now</button>
              <button onClick={() => setIsRegisteredAnswer(null)} className="px-6 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-bold">Cancel</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleNewRegistration} className="space-y-5 max-w-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Official Name</label>
                <input
                  type="text"
                  required
                  value={regForm.name}
                  onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-emerald-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Student Email</label>
                <input
                  type="email"
                  required
                  value={regForm.email}
                  onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-emerald-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number (M-Pesa)</label>
                <input
                  type="tel"
                  required
                  value={regForm.phone}
                  onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-emerald-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Year of Study</label>
                <select
                  value={regForm.year}
                  onChange={(e) => setRegForm({ ...regForm, year: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-emerald-600 outline-none bg-white"
                >
                  <option value="Year 1">Year 1</option>
                  <option value="Year 2">Year 2</option>
                  <option value="Year 3">Year 3</option>
                  <option value="Year 4">Year 4</option>
                  <option value="Year 5">Year 5</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Member Registration"}
              </button>
              <button type="button" onClick={() => setWantsToRegister(null)} className="px-4 py-3 rounded-xl text-gray-500 hover:text-gray-800 text-sm font-semibold">Back</button>
            </div>
          </form>
        )}
      </section>

      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-emerald-950">Member Directory</h2>
            <p className="text-xs sm:text-sm text-gray-500">Connect and message other signed-up members.</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="h-4 w-4 text-gray-400 absolute left-3.5 top-3" />
            <input type="text" placeholder="Search directory..." value={directorySearch} onChange={(e) => setDirectorySearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 text-sm border rounded-xl border-gray-200 outline-none focus:border-emerald-600 bg-white" />
          </div>
        </div>

        {isFetchingDirectory ? (
           <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-200">
             <Loader2 className="h-6 w-6 animate-spin text-emerald-600 mx-auto mb-2" />
             <p className="text-sm text-gray-500">Loading directory...</p>
           </div>
        ) : directoryMembers.length === 0 ? (
           <div className="p-8 text-center text-gray-500"><p>No members found in the directory yet.</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredDirectory.map((member, index) => {
              const displayStatus = member.status || "Pending Approval";
              const firstName = (member.fullName || "Unknown").split(" ")[0];
              const profileImg = member.imageUrl || member.photoURL;

              return (
                <div 
                  key={index} 
                  onClick={() => router.push(`/dashboard/member/${member.clerkId}`)}
                  className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:border-emerald-300 transition flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {profileImg ? (
                        <img src={profileImg} alt={firstName} className="h-10 w-10 rounded-full object-cover group-hover:ring-2 ring-emerald-200 transition" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center group-hover:ring-2 ring-emerald-200 transition">
                          {firstName[0]}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 leading-tight group-hover:text-emerald-700 transition">{member.fullName}</h3>
                      <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${displayStatus === "Registered Member" ? "text-emerald-700 bg-emerald-50 border border-emerald-200" : "text-amber-700 bg-amber-50 border border-amber-200"}`}>
                        {displayStatus}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setMessagingTarget(member); 
                    }} 
                    className="p-2.5 rounded-xl border border-gray-200 hover:border-emerald-600 hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 transition shrink-0" 
                    title={`Message ${firstName}`}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* NEW REGISTRATION PAYMENT MODAL */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => {
                setIsPaymentModalOpen(false);
                setStatusNotice(`Thanks for applying! A confirmation email and notification have been dispatched to ${regForm.email} with instructions to complete the fee.`);
              }} 
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition"
            >
              <X className="h-5 w-5" />
            </button>

            {paymentStep === "ask_pay" && (
              <div className="text-center space-y-6 py-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-emerald-950">Registration Logged! 🎉</h3>
                  <p className="text-sm text-gray-600 mt-2">
                    Your details for DEKUWEC Membership have been recorded.
                  </p>
                  <p className="text-sm font-bold text-emerald-800 mt-4">Do you want to complete your registration payment now?</p>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => setPaymentStep("checkout")}
                    className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition"
                  >
                    Next: Proceed to Pay (KES {membershipFee})
                  </button>
                  <button 
                    onClick={() => {
                      setIsPaymentModalOpen(false);
                      setStatusNotice(`Thanks for applying! A confirmation email and notification have been dispatched to ${regForm.email} with instructions to complete the fee.`);
                    }}
                    className="w-full py-3.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition"
                  >
                    I'll Pay Later
                  </button>
                </div>
              </div>
            )}

            {paymentStep === "checkout" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-black text-emerald-950">M-Pesa Checkout</h3>
                  <p className="text-xs text-gray-500 mt-1">Confirm fee and M-Pesa phone number for the STK Prompt.</p>
                </div>

                <form onSubmit={handleInitiatePayment} className="space-y-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Registration Fee</span>
                    <span className="text-xl font-black text-emerald-950">KES {membershipFee}</span>
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
          </div>
        </div>
      )}

      {/* Direct Messaging Modal */}
      {messagingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col" style={{ maxHeight: '80vh' }}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
              <div>
                <h3 className="text-lg font-black text-emerald-950">{messagingTarget.fullName.split(" ")[0]}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Direct Message</p>
              </div>
              <button onClick={() => setMessagingTarget(null)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div ref={chatScrollRef} className="p-5 flex-1 overflow-y-auto bg-gray-50 space-y-4 min-h-[250px]">
              {isFetchingChat ? (
                <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div>
              ) : chatHistory.length === 0 ? (
                <div className="text-center text-gray-400 text-sm mt-10">No messages yet. Say hello!</div>
              ) : (
                chatHistory.map((msg, i) => {
                  const isMine = msg.senderId === user?.id;
                  return (
                    <div key={i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${isMine ? 'bg-emerald-600 text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'}`}>
                        {msg.content}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 bg-white border-t border-gray-100 shrink-0">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input type="text" required placeholder="Type a message..." value={messageText} onChange={(e) => setMessageText(e.target.value)} className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 text-sm focus:border-emerald-600 outline-none bg-gray-50 focus:bg-white" />
                <button type="submit" disabled={!messageText.trim()} className="p-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white transition disabled:opacity-50 shrink-0">
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}