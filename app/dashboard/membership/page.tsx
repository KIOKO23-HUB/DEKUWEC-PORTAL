"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { 
  Users, 
  CheckCircle2, 
  Search, 
  MessageSquare, 
  UserCheck, 
  Send,
  X,
  AlertCircle,
  Loader2
} from "lucide-react";

// Official Registered Roster (For Dropdown Verification)
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

  const [isRegisteredAnswer, setIsRegisteredAnswer] = useState<"yes" | "no" | null>(null);
  const [wantsToRegister, setWantsToRegister] = useState<boolean | null>(null);
  const [selectedRosterName, setSelectedRosterName] = useState("");
  const [rosterSearch, setRosterSearch] = useState("");
  const [directorySearch, setDirectorySearch] = useState("");
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // New State for Directory
  const [directoryMembers, setDirectoryMembers] = useState<any[]>([]);
  const [isFetchingDirectory, setIsFetchingDirectory] = useState(true);

  const [regForm, setRegForm] = useState({
    name: user?.fullName || "",
    email: user?.primaryEmailAddress?.emailAddress || "",
    phone: "",
    year: "Year 1",
  });

  const [messagingTarget, setMessagingTarget] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sentNotice, setSentNotice] = useState(false);

  // Fetch full directory on load
  useEffect(() => {
    const fetchDirectory = async () => {
      try {
        const res = await fetch("/api/directory");
        if (res.ok) {
          const data = await res.json();
          setDirectoryMembers(data);
        }
      } catch (error) {
        console.error("Failed to fetch member directory", error);
      } finally {
        setIsFetchingDirectory(false);
      }
    };
    if (isLoaded) fetchDirectory();
  }, [isLoaded]);

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

      if (res.ok) {
        setStatusNotice(`Thanks for confirming your registration as "${selectedRosterName}". Your record is pending admin approval.`);
      } else {
        alert("Failed to submit claim. Please try again.");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred.");
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
        setStatusNotice(`Thanks for applying! A confirmation email and notification have been dispatched to ${regForm.email} with instructions to send the registration fee to 0118506251.`);
      } else {
        alert("Failed to submit registration. Please try again.");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    setSentNotice(true);
    setTimeout(() => {
      setSentNotice(false);
      setMessagingTarget(null);
      setMessageText("");
    }, 1500);
  };

  const filteredRoster = rosterMembers.filter((name) =>
    name.toLowerCase().includes(rosterSearch.toLowerCase())
  );

  // Filter the actual MongoDB directory state
  const filteredDirectory = directoryMembers.filter((member) =>
    (member.fullName || "").toLowerCase().includes(directorySearch.toLowerCase())
  );

  if (!isLoaded) return null;

  return (
    <div className="p-6 sm:p-8 lg:p-12 max-w-7xl mx-auto space-y-10">
      
      {/* Header */}
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

      {/* Confirmation & Registration Card */}
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
            <p className="text-base font-semibold text-gray-800">
              Are you an existing registered DEKUWEC member?
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setIsRegisteredAnswer("yes")}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition shadow-sm"
              >
                Yes, I am registered
              </button>
              <button
                onClick={() => setIsRegisteredAnswer("no")}
                className="px-6 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-bold transition"
              >
                No, I am not registered
              </button>
            </div>
          </div>
        ) : isRegisteredAnswer === "yes" ? (
          <form onSubmit={handleClaimRoster} className="space-y-5 max-w-xl">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                Select Your Name from the Official Roster
              </label>
              <div className="relative mb-3">
                <Search className="h-4 w-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Filter roster names..."
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border rounded-xl border-gray-200 outline-none focus:border-emerald-600"
                />
              </div>
              <select
                size={6}
                required
                value={selectedRosterName}
                onChange={(e) => setSelectedRosterName(e.target.value)}
                className="w-full p-2 border rounded-xl border-gray-200 text-sm focus:border-emerald-600 outline-none bg-white"
              >
                {filteredRoster.map((name, idx) => (
                  <option key={idx} value={name} className="p-2 hover:bg-emerald-50 rounded">
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={!selectedRosterName || isSubmitting}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? "Submitting..." : "Confirm Identity & Submit"}
              </button>
              <button
                type="button"
                onClick={() => setIsRegisteredAnswer(null)}
                className="px-4 py-3 rounded-xl text-gray-500 hover:text-gray-800 text-sm font-semibold"
              >
                Back
              </button>
            </div>
          </form>
        ) : wantsToRegister === null ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-amber-800 bg-amber-50 p-4 rounded-xl border border-amber-200">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">
                You are currently not listed as a registered member.
              </p>
            </div>
            <p className="text-base font-semibold text-gray-800">
              Do you want to register as a new DEKUWEC member?
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setWantsToRegister(true)}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition"
              >
                Yes, Register Now
              </button>
              <button
                onClick={() => setIsRegisteredAnswer(null)}
                className="px-6 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-bold transition"
              >
                Cancel
              </button>
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
                  placeholder="e.g. Kelvin Maina"
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
                  placeholder="student@students.dkut.ac.ke"
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
                  placeholder="07..."
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
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? "Processing..." : "Submit Member Registration"}
              </button>
              <button
                type="button"
                onClick={() => setWantsToRegister(null)}
                className="px-4 py-3 rounded-xl text-gray-500 hover:text-gray-800 text-sm font-semibold"
              >
                Back
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Member Directory & Messaging Grid */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-emerald-950">Member Directory</h2>
            <p className="text-xs sm:text-sm text-gray-500">Connect and message other signed-up members.</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="h-4 w-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search directory..."
              value={directorySearch}
              onChange={(e) => setDirectorySearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border rounded-xl border-gray-200 outline-none focus:border-emerald-600 bg-white"
            />
          </div>
        </div>

        {isFetchingDirectory ? (
           <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-200">
             <Loader2 className="h-6 w-6 animate-spin text-emerald-600 mx-auto mb-2" />
             <p className="text-sm text-gray-500">Loading directory...</p>
           </div>
        ) : directoryMembers.length === 0 ? (
           <div className="p-8 text-center text-gray-500">
             <p>No members found in the directory yet.</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredDirectory.map((member, index) => {
              const displayStatus = member.status || "Pending Approval";
              const firstName = (member.fullName || "Unknown").split(" ")[0];

              return (
                <div 
                  key={index}
                  className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:border-emerald-300 transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {member.imageUrl ? (
                        <img src={member.imageUrl} alt={firstName} className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center">
                          {firstName[0]}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 leading-tight">{member.fullName}</h3>
                      <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        displayStatus === "Registered Member"
                          ? "text-emerald-700 bg-emerald-50 border border-emerald-200" 
                          : "text-amber-700 bg-amber-50 border border-amber-200"
                      }`}>
                        {displayStatus}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setMessagingTarget(member.fullName)}
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

      {/* Direct Messaging Modal */}
      {messagingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setMessagingTarget(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition"
            >
              <X className="h-5 w-5" />
            </button>

            {sentNotice ? (
              <div className="text-center py-6 space-y-3">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                <h3 className="text-lg font-bold text-gray-900">Message Delivered</h3>
                <p className="text-xs text-gray-500">
                  Your message has been routed to {messagingTarget.split(" ")[0]}'s inbox.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="space-y-4">
                <div>
                  <h3 className="text-lg font-black text-emerald-950">
                    Message {messagingTarget.split(" ")[0]}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">Send a quick direct message to {messagingTarget}.</p>
                </div>

                <textarea
                  required
                  rows={4}
                  placeholder={`Write your message to ${messagingTarget.split(" ")[0]}...`}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:border-emerald-600 outline-none resize-none"
                />

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition flex items-center justify-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  <span>Send Message</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
