"use client";

import { useState, useEffect } from "react";
import { 
  Users, Calendar, Megaphone, MessageSquare, CreditCard, 
  CheckCircle, ShieldCheck, Image as ImageIcon, Link as LinkIcon, 
  Send, List, Camera, Radio, Crown, Loader2, RefreshCw,
  Edit2, Trash2, X, Lock, KeyRound, Check, AlertCircle
} from "lucide-react";

export default function DekuwecAdminDashboard() {
  // --- Authentication State ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [authError, setAuthError] = useState("");
  const [verifying, setVerifying] = useState(false);

  // --- Navigation & Core States ---
  const [activeTab, setActiveTab] = useState("approvals");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // --- Live Collections from MongoDB ---
  const [pendingMembers, setPendingMembers] = useState<any[]>([]);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [wckApplicants, setWckApplicants] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [eventRegistrations, setEventRegistrations] = useState<any[]>([]);
  const [ecoPulsePosts, setEcoPulsePosts] = useState<any[]>([]);
  const [snaps, setSnaps] = useState<any[]>([]);
  const [leaders, setLeaders] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);

  // --- Active Edit Trackers (Null = Creating new item) ---
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingEcoId, setEditingEcoId] = useState<string | null>(null);
  const [editingSnapId, setEditingSnapId] = useState<string | null>(null);
  const [editingLeaderId, setEditingLeaderId] = useState<string | null>(null);

  // --- Form States ---
  const [broadcastData, setBroadcastData] = useState({ title: "", message: "", imageUrl: "", link: "" });
  
  const [eventForm, setEventForm] = useState({
    title: "", category: "upcoming", date: "", time: "", location: "", imageUrl: "", galleryLink: "", description: ""
  });

  const [ecoType, setEcoType] = useState<"topic" | "quiz">("topic");
  const [ecoArticleForm, setEcoArticleForm] = useState({
    title: "", category: "Conservation", imageUrl: "", link: "", content: ""
  });
  const [ecoQuizForm, setEcoQuizForm] = useState({
    question: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "A", explanation: ""
  });

  const [snapForm, setSnapForm] = useState({
    title: "", photographer: "", imageUrl: "", type: "winner", description: ""
  });

  const [leaderForm, setLeaderForm] = useState({
    name: "", role: "", bio: "", imageUrl: "", order: 1
  });

  // --- Check Authentication on Mount ---
  useEffect(() => {
    const isAuth = sessionStorage.getItem("dekuwec_admin_auth");
    if (isAuth === "true") {
      setIsAuthenticated(true);
      fetchAllAdminData();
    } else {
      setLoading(false);
    }
  }, []);

  // --- Verify Admin Passcode ---
  const handleVerifyPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setAuthError("");

    try {
      const res = await fetch("/api/admin/verify-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: passcode }),
      });

      if (res.ok) {
        sessionStorage.setItem("dekuwec_admin_auth", "true");
        setIsAuthenticated(true);
        fetchAllAdminData();
      } else {
        setAuthError("Unauthorized access. Invalid Admin Secret Key.");
      }
    } catch {
      setAuthError("Server verification error. Try again.");
    } finally {
      setVerifying(false);
    }
  };

  // --- Unified Data Retrieval ---
  const fetchAllAdminData = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/data");
      const data = await res.json();
      if (res.ok) {
        setPendingMembers(data.pendingMembers || []);
        setAllMembers(data.allMembers || []);
        setWckApplicants(data.wckApplicants || []);
        setEvents(data.events || []);
        setEventRegistrations(data.eventRegistrations || []);
        setEcoPulsePosts(data.ecoPulsePosts || []);
        setSnaps(data.snaps || []);
        setLeaders(data.leaders || []);
        setFeedbacks(data.feedbacks || []);
      }
    } catch (err) {
      console.error("Master fetch failed:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ==========================================
  // HANDLERS: APPROVALS
  // ==========================================
  const handleApproveMember = async (member: any) => {
    setApprovingId(member.clerkId);
    try {
      const res = await fetch("/api/admin/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: member.clerkId,
          email: member.email,
          fullName: member.fullName || member.displayName || "Member"
        }),
      });

      if (res.ok) {
        setPendingMembers((prev) => prev.filter((m) => m.clerkId !== member.clerkId));
        alert(`Member ${member.fullName || member.email} approved! Automated email & notification sent.`);
      } else {
        alert("Failed to approve member.");
      }
    } catch (err) {
      console.error(err);
      alert("Error approving member.");
    } finally {
      setApprovingId(null);
    }
  };

  // ==========================================
  // HANDLERS: EVENTS (CREATE / EDIT / DELETE)
  // ==========================================
  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const method = editingEventId ? "PUT" : "POST";
      const payload = editingEventId ? { id: editingEventId, ...eventForm } : eventForm;

      const res = await fetch("/api/admin/events", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert(editingEventId ? "Event updated successfully!" : "New event published!");
        setEditingEventId(null);
        setEventForm({ title: "", category: "upcoming", date: "", time: "", location: "", imageUrl: "", galleryLink: "", description: "" });
        fetchAllAdminData();
      } else {
        alert("Failed to save event.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditEvent = (evt: any) => {
    setEditingEventId(evt._id);
    setEventForm({
      title: evt.title,
      category: evt.category,
      date: evt.date,
      time: evt.time || "",
      location: evt.location || "",
      imageUrl: evt.imageUrl || "",
      galleryLink: evt.galleryLink || "",
      description: evt.description
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this event?")) return;
    const res = await fetch(`/api/admin/events?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchAllAdminData();
  };

  // ==========================================
  // HANDLERS: ECOPULSE (CREATE / EDIT / DELETE)
  // ==========================================
  const handleEcoPulseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let payload: any = {};
      if (ecoType === "topic") {
        payload = {
          type: "topic",
          title: ecoArticleForm.title,
          category: ecoArticleForm.category,
          imageUrl: ecoArticleForm.imageUrl,
          link: ecoArticleForm.link,
          content: ecoArticleForm.content,
        };
      } else {
        payload = {
          type: "quiz",
          title: ecoQuizForm.question,
          content: ecoQuizForm.explanation,
          options: [
            { id: "A", text: ecoQuizForm.optionA },
            { id: "B", text: ecoQuizForm.optionB },
            { id: "C", text: ecoQuizForm.optionC },
            { id: "D", text: ecoQuizForm.optionD },
          ],
          correctAnswer: ecoQuizForm.correctAnswer,
        };
      }

      const method = editingEcoId ? "PUT" : "POST";
      if (editingEcoId) payload.id = editingEcoId;

      const res = await fetch("/api/ecopulse", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert(editingEcoId ? "EcoPulse content updated!" : "EcoPulse post published!");
        setEditingEcoId(null);
        setEcoArticleForm({ title: "", category: "Conservation", imageUrl: "", link: "", content: "" });
        setEcoQuizForm({ question: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "A", explanation: "" });
        fetchAllAdminData();
      } else {
        alert("Failed to save EcoPulse entry.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditEco = (post: any) => {
    setEditingEcoId(post._id);
    setEcoType(post.type);
    if (post.type === "topic") {
      setEcoArticleForm({
        title: post.title,
        category: post.category || "Conservation",
        imageUrl: post.imageUrl || "",
        link: post.link || "",
        content: post.content,
      });
    } else {
      const optMap: Record<string, string> = {};
      (post.options || []).forEach((o: any) => { optMap[o.id] = o.text; });
      setEcoQuizForm({
        question: post.title,
        optionA: optMap["A"] || "",
        optionB: optMap["B"] || "",
        optionC: optMap["C"] || "",
        optionD: optMap["D"] || "",
        correctAnswer: post.correctAnswer || "A",
        explanation: post.content,
      });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteEco = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this EcoPulse post?")) return;
    const res = await fetch(`/api/ecopulse?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchAllAdminData();
  };

  // ==========================================
  // HANDLERS: NATURE SNAPS (CREATE / EDIT / DELETE)
  // ==========================================
  const handleSnapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const method = editingSnapId ? "PUT" : "POST";
      const payload = editingSnapId ? { id: editingSnapId, ...snapForm } : snapForm;

      const res = await fetch("/api/snaps", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert(editingSnapId ? "Nature Snap updated!" : "Nature Snap published!");
        setEditingSnapId(null);
        setSnapForm({ title: "", photographer: "", imageUrl: "", type: "winner", description: "" });
        fetchAllAdminData();
      } else {
        alert("Failed to save snap.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSnap = (snap: any) => {
    setEditingSnapId(snap._id);
    setSnapForm({
      title: snap.title,
      photographer: snap.photographer,
      imageUrl: snap.imageUrl,
      type: snap.type,
      description: snap.description || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteSnap = async (id: string) => {
    if (!confirm("Are you sure you want to delete this snap?")) return;
    const res = await fetch(`/api/snaps?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchAllAdminData();
  };

  // ==========================================
  // HANDLERS: LEADERS (CREATE / EDIT / DELETE)
  // ==========================================
  const handleLeaderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const method = editingLeaderId ? "PUT" : "POST";
      const payload = editingLeaderId ? { id: editingLeaderId, ...leaderForm } : leaderForm;

      const res = await fetch("/api/admin/leaders", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert(editingLeaderId ? "Leader updated!" : "New Leader added!");
        setEditingLeaderId(null);
        setLeaderForm({ name: "", role: "", bio: "", imageUrl: "", order: 1 });
        fetchAllAdminData();
      } else {
        alert("Failed to save leader profile.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditLeader = (ldr: any) => {
    setEditingLeaderId(ldr._id);
    setLeaderForm({
      name: ldr.name,
      role: ldr.role,
      bio: ldr.bio || "",
      imageUrl: ldr.imageUrl || "",
      order: ldr.order || 1,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteLeader = async (id: string) => {
    if (!confirm("Are you sure you want to delete this leader?")) return;
    const res = await fetch(`/api/admin/leaders?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchAllAdminData();
  };

  // ==========================================
  // HANDLERS: BROADCAST ANNOUNCEMENT
  // ==========================================
  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(broadcastData),
      });

      if (res.ok) {
        alert("Broadcast dispatched via mass email and notification bell to all members!");
        setBroadcastData({ title: "", message: "", imageUrl: "", link: "" });
      } else {
        alert("Failed to dispatch broadcast.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // RENDER: PASSWORD PROTECTION GATE
  // ==========================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-emerald-950 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6 text-center animate-in fade-in zoom-in duration-200">
          <div className="mx-auto w-24 h-24 rounded-full overflow-hidden border-4 border-emerald-500 shadow-md">
            <img 
              src="https://i.postimg.cc/qB9gLwmz/Whats-App-Image-2026-09-03-at-09-49-04.jpg" 
              alt="DEKUWEC Official Logo" 
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-xl font-black text-emerald-950 tracking-tight">DEKUWEC ADMINS AND LEADERS</h1>
            <p className="text-xs font-semibold text-gray-500 mt-1">Executive Portal Passcode Verification</p>
          </div>

          <form onSubmit={handleVerifyPasscode} className="space-y-4">
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-400" />
              <input
                type="password"
                required
                placeholder="Enter ADMIN_SECRET_KEY..."
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-emerald-600 text-sm font-medium transition"
              />
            </div>

            {authError && (
              <div className="flex items-center gap-1.5 text-xs text-rose-600 font-bold justify-center">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={verifying}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold py-3.5 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-md"
            >
              {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              <span>Verify Key & Open Portal</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: LOADING VIEWPORT
  // ==========================================
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 text-emerald-600 animate-spin" />
          <p className="font-bold text-emerald-950 text-sm">Loading DEKUWEC Control Center...</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: MAIN ADMIN COMMAND CENTER
  // ==========================================
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      
      {/* Sticky Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-emerald-950 text-white flex-shrink-0 flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto z-20 sticky top-0 md:h-screen shadow-xl scrollbar-hide">
        <div className="p-5 hidden md:flex items-center gap-3 border-b border-emerald-900/60">
          <img 
            src="https://i.postimg.cc/qB9gLwmz/Whats-App-Image-2026-09-03-at-09-49-04.jpg" 
            alt="DEKUWEC Logo" 
            className="w-10 h-10 rounded-full border-2 border-emerald-400 object-cover shrink-0"
          />
          <div className="overflow-hidden">
            <h1 className="text-xs font-black tracking-tight leading-tight text-white truncate">DEKUWEC ADMINS AND LEADERS</h1>
            <span className="text-[10px] text-emerald-400 font-bold block">Executive Portal</span>
          </div>
          <button 
            onClick={fetchAllAdminData} 
            title="Refresh All Collections"
            className="ml-auto p-1.5 hover:bg-emerald-900 rounded-lg text-emerald-300 transition"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        <nav className="flex md:flex-col p-2 md:p-3 gap-1.5 flex-nowrap w-full">
          {[
            { id: "approvals", icon: CheckCircle, label: `Approvals (${pendingMembers.length})` },
            { id: "wck", icon: CreditCard, label: `WCK Cards (${wckApplicants.length})` },
            { id: "members", icon: Users, label: `All Members (${allMembers.length})` },
            { id: "events", icon: Calendar, label: `Events & RSVPs (${events.length})` },
            { id: "ecopulse", icon: Radio, label: `EcoPulse (${ecoPulsePosts.length})` },
            { id: "snaps", icon: Camera, label: `Nature Snaps (${snaps.length})` },
            { id: "leaders", icon: Crown, label: `Leaders (${leaders.length})` },
            { id: "broadcast", icon: Megaphone, label: "Broadcasts" },
            { id: "feedback", icon: MessageSquare, label: `Feedback (${feedbacks.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all whitespace-nowrap md:whitespace-normal font-bold text-xs ${
                activeTab === tab.id 
                  ? "bg-emerald-600 text-white shadow-md" 
                  : "text-emerald-300 hover:bg-emerald-900/50 hover:text-white"
              }`}
            >
              <tab.icon className="h-4 w-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Workspace */}
      <main className="flex-1 p-4 sm:p-8 lg:p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8 pb-20">

          {/* 1. APPROVALS TAB */}
          {activeTab === "approvals" && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 animate-in fade-in">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-black text-emerald-950 flex items-center gap-2">
                    <CheckCircle className="text-emerald-600" /> Pending Registrations
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">Confirm student M-Pesa payments (0118506251) and activate membership access.</p>
                </div>
                <button 
                  onClick={fetchAllAdminData}
                  className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition"
                >
                  Refresh
                </button>
              </div>

              {pendingMembers.length === 0 ? (
                <div className="text-center py-12 text-gray-400 font-medium bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  No members currently pending approval.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[650px]">
                    <thead>
                      <tr className="bg-gray-50 text-xs uppercase text-gray-500 font-bold border-y border-gray-200">
                        <th className="p-4">Applicant</th>
                        <th className="p-4">Contact</th>
                        <th className="p-4">Year / Type</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingMembers.map((member) => (
                        <tr key={member._id || member.clerkId} className="border-b border-gray-100 hover:bg-gray-50 text-sm">
                          <td className="p-4 font-bold text-gray-900">
                            {member.fullName || member.displayName || "User"}
                            {member.claimedRosterName && (
                              <span className="block text-[11px] text-amber-700 font-bold">Claim: {member.claimedRosterName}</span>
                            )}
                          </td>
                          <td className="p-4 text-gray-600">
                            <div>{member.email}</div>
                            {member.phone && <div className="text-xs text-gray-400 font-medium">{member.phone}</div>}
                          </td>
                          <td className="p-4 text-gray-600">
                            <div>{member.yearOfStudy || member.year || "Year 1"}</div>
                          </td>
                          <td className="p-4">
                            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">{member.status}</span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleApproveMember(member)}
                              disabled={approvingId === member.clerkId}
                              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold px-4 py-2 rounded-xl text-xs transition flex items-center gap-1.5 ml-auto"
                            >
                              {approvingId === member.clerkId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                              Approve
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 2. WCK CARDS TAB */}
          {activeTab === "wck" && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 animate-in fade-in">
              <h2 className="text-2xl font-black text-emerald-950 mb-2 flex items-center gap-2">
                <CreditCard className="text-emerald-600" /> Wildlife Clubs of Kenya (WCK) Card Roster
              </h2>
              <p className="text-sm text-gray-500 mb-6">List of students requesting national park affiliate cards.</p>

              {wckApplicants.length === 0 ? (
                <div className="text-center py-12 text-gray-400 font-medium bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  No WCK applications logged yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[650px]">
                    <thead>
                      <tr className="bg-gray-50 text-xs uppercase text-gray-500 font-bold border-y border-gray-200">
                        <th className="p-4">Full Name</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Phone</th>
                        <th className="p-4">Year</th>
                        <th className="p-4">Age Bracket</th>
                        <th className="p-4">Applied</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wckApplicants.map((app) => (
                        <tr key={app._id} className="border-b border-gray-100 hover:bg-gray-50 text-sm">
                          <td className="p-4 font-bold text-gray-900">{app.fullName}</td>
                          <td className="p-4 text-gray-600">{app.email}</td>
                          <td className="p-4 font-semibold text-emerald-700">{app.phone || "—"}</td>
                          <td className="p-4 text-gray-600">{app.yearOfStudy || "—"}</td>
                          <td className="p-4 font-medium text-gray-500">{app.ageBracket || "—"}</td>
                          <td className="p-4 text-xs text-gray-400">{app.createdAt ? new Date(app.createdAt).toLocaleDateString() : "Recent"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 3. ALL MEMBERS TAB */}
          {activeTab === "members" && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 animate-in fade-in">
              <h2 className="text-2xl font-black text-emerald-950 mb-2 flex items-center gap-2">
                <Users className="text-emerald-600" /> Master Registered Portal Accounts
              </h2>
              <p className="text-sm text-gray-500 mb-6">Complete master list of student signups in the database.</p>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[650px]">
                  <thead>
                    <tr className="bg-gray-50 text-xs uppercase text-gray-500 font-bold border-y border-gray-200">
                      <th className="p-4">Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Course</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allMembers.map((member) => (
                      <tr key={member._id || member.clerkId} className="border-b border-gray-100 hover:bg-gray-50 text-sm">
                        <td className="p-4 font-bold text-gray-900">{member.fullName || member.displayName || "User"}</td>
                        <td className="p-4 text-gray-600">{member.email}</td>
                        <td className="p-4 text-gray-600">{member.course || "General"}</td>
                        <td className="p-4">
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                            member.status === "Approved" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700"
                          }`}>
                            {member.status || "Unregistered"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. EVENTS TAB (WITH EDIT / DELETE) */}
          {activeTab === "events" && (
            <div className="space-y-8 animate-in fade-in">
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-black text-emerald-950 flex items-center gap-2">
                    <Calendar className="text-emerald-600" /> {editingEventId ? "Edit Event" : "Post New Event / Activity"}
                  </h2>
                  {editingEventId && (
                    <button 
                      onClick={() => {
                        setEditingEventId(null);
                        setEventForm({ title: "", category: "upcoming", date: "", time: "", location: "", imageUrl: "", galleryLink: "", description: "" });
                      }}
                      className="text-xs text-rose-600 font-bold hover:underline flex items-center gap-1"
                    >
                      <X className="h-3 w-3" /> Cancel Edit
                    </button>
                  )}
                </div>

                <form onSubmit={handleEventSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">Placement</label>
                    <select
                      value={eventForm.category}
                      onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold outline-none focus:border-emerald-600"
                    >
                      <option value="upcoming">Upcoming Event (With RSVP Participation Button)</option>
                      <option value="previous">Previous Event (With Photo Gallery Link)</option>
                      <option value="project">Ongoing Club Initiative / Long-Term Project</option>
                    </select>
                  </div>

                  <input
                    type="text"
                    required
                    placeholder="Event Title (e.g. Karuru Falls Expedition)"
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      required
                      placeholder="Date (e.g. Saturday, Oct 10, 2026)"
                      value={eventForm.date}
                      onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600"
                    />
                    <input
                      type="text"
                      placeholder="Time (e.g. 6:30 AM)"
                      value={eventForm.time}
                      onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Location / Meeting Point (e.g. Main Gate, DeKUT)"
                      value={eventForm.location}
                      onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600"
                    />
                    <input
                      type="url"
                      placeholder="Image Flyer URL (https://...)"
                      value={eventForm.imageUrl}
                      onChange={(e) => setEventForm({ ...eventForm, imageUrl: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600"
                    />
                  </div>

                  {eventForm.category === "previous" && (
                    <input
                      type="url"
                      placeholder="Google Photos Gallery Link (https://photos.app.goo.gl/...)"
                      value={eventForm.galleryLink}
                      onChange={(e) => setEventForm({ ...eventForm, galleryLink: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600"
                    />
                  )}

                  <textarea
                    rows={4}
                    required
                    placeholder="Event Description & Logistical Instructions..."
                    value={eventForm.description}
                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600"
                  />

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold py-3.5 rounded-xl text-sm transition flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    <span>{editingEventId ? "Save Event Changes" : "Publish Event to Portal"}</span>
                  </button>
                </form>
              </div>

              {/* Manage Existing Events */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold text-emerald-950 mb-4">Manage Posted Events</h3>
                {events.length === 0 ? (
                  <p className="text-sm text-gray-400">No events posted yet.</p>
                ) : (
                  <div className="space-y-3">
                    {events.map((evt) => (
                      <div key={evt._id} className="p-4 rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-sm text-gray-900">{evt.title}</h4>
                          <span className="text-xs text-emerald-700 font-semibold uppercase">{evt.category} • {evt.date}</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleEditEvent(evt)} className="p-2 text-emerald-700 hover:bg-emerald-100 rounded-lg">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDeleteEvent(evt._id)} className="p-2 text-rose-600 hover:bg-rose-100 rounded-lg">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Event RSVPs Master Table */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold text-emerald-950 mb-4">Event Registrations / Participants ({eventRegistrations.length})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-gray-50 text-xs uppercase text-gray-500 font-bold border-y border-gray-200">
                        <th className="p-4">Participant</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Event</th>
                        <th className="p-4">Registered Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventRegistrations.map((reg) => (
                        <tr key={reg._id} className="border-b border-gray-100 hover:bg-gray-50 text-sm">
                          <td className="p-4 font-bold text-gray-900">{reg.fullName}</td>
                          <td className="p-4 text-gray-600">{reg.email}</td>
                          <td className="p-4 font-bold text-emerald-700">{reg.eventName}</td>
                          <td className="p-4 text-xs text-gray-400">{new Date(reg.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 5. ECOPULSE TAB (STRUCTURED 4-OPTION QUIZ & ARTICLES) */}
          {activeTab === "ecopulse" && (
            <div className="space-y-8 animate-in fade-in">
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-black text-emerald-950 flex items-center gap-2">
                    <Radio className="text-emerald-600" /> {editingEcoId ? "Edit EcoPulse Entry" : "Post to EcoPulse Dispatch"}
                  </h2>
                  {editingEcoId && (
                    <button 
                      onClick={() => {
                        setEditingEcoId(null);
                        setEcoArticleForm({ title: "", category: "Conservation", imageUrl: "", link: "", content: "" });
                        setEcoQuizForm({ question: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "A", explanation: "" });
                      }}
                      className="text-xs text-rose-600 font-bold hover:underline flex items-center gap-1"
                    >
                      <X className="h-3 w-3" /> Cancel Edit
                    </button>
                  )}
                </div>

                <div className="flex gap-3 mb-6">
                  <button
                    type="button"
                    onClick={() => setEcoType("topic")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                      ecoType === "topic" ? "bg-emerald-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Weekly Article / Topic
                  </button>
                  <button
                    type="button"
                    onClick={() => setEcoType("quiz")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                      ecoType === "quiz" ? "bg-emerald-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Question of the Week (4-Option Quiz)
                  </button>
                </div>

                <form onSubmit={handleEcoPulseSubmit} className="space-y-4">
                  {ecoType === "topic" ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                          type="text"
                          required
                          placeholder="Article Title"
                          value={ecoArticleForm.title}
                          onChange={(e) => setEcoArticleForm({ ...ecoArticleForm, title: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600"
                        />
                        <select
                          value={ecoArticleForm.category}
                          onChange={(e) => setEcoArticleForm({ ...ecoArticleForm, category: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold outline-none focus:border-emerald-600"
                        >
                          <option value="Conservation">Conservation</option>
                          <option value="Global Environment">Global Environment</option>
                          <option value="Socio-Economic">Socio-Economic & Current Affairs</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                          type="url"
                          placeholder="Thumbnail Image URL"
                          value={ecoArticleForm.imageUrl}
                          onChange={(e) => setEcoArticleForm({ ...ecoArticleForm, imageUrl: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600"
                        />
                        <input
                          type="url"
                          placeholder="External Discussion Link (Optional)"
                          value={ecoArticleForm.link}
                          onChange={(e) => setEcoArticleForm({ ...ecoArticleForm, link: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600"
                        />
                      </div>

                      <textarea
                        rows={5}
                        required
                        placeholder="Article excerpt or content..."
                        value={ecoArticleForm.content}
                        onChange={(e) => setEcoArticleForm({ ...ecoArticleForm, content: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600"
                      />
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Question of the Week</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. What is the primary reason flamingos shifted migration patterns?"
                          value={ecoQuizForm.question}
                          onChange={(e) => setEcoQuizForm({ ...ecoQuizForm, question: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">Option A</label>
                          <input
                            type="text"
                            required
                            placeholder="Option A..."
                            value={ecoQuizForm.optionA}
                            onChange={(e) => setEcoQuizForm({ ...ecoQuizForm, optionA: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">Option B</label>
                          <input
                            type="text"
                            required
                            placeholder="Option B..."
                            value={ecoQuizForm.optionB}
                            onChange={(e) => setEcoQuizForm({ ...ecoQuizForm, optionB: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">Option C</label>
                          <input
                            type="text"
                            required
                            placeholder="Option C..."
                            value={ecoQuizForm.optionC}
                            onChange={(e) => setEcoQuizForm({ ...ecoQuizForm, optionC: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">Option D</label>
                          <input
                            type="text"
                            required
                            placeholder="Option D..."
                            value={ecoQuizForm.optionD}
                            onChange={(e) => setEcoQuizForm({ ...ecoQuizForm, optionD: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-emerald-800 mb-1">Correct Answer</label>
                          <select
                            value={ecoQuizForm.correctAnswer}
                            onChange={(e) => setEcoQuizForm({ ...ecoQuizForm, correctAnswer: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 font-bold text-sm outline-none"
                          >
                            <option value="A">Option A</option>
                            <option value="B">Option B</option>
                            <option value="C">Option C</option>
                            <option value="D">Option D</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Answer Explanation</label>
                          <input
                            type="text"
                            required
                            placeholder="Why is this the answer? (Revealed after submission)"
                            value={ecoQuizForm.explanation}
                            onChange={(e) => setEcoQuizForm({ ...ecoQuizForm, explanation: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold py-3.5 rounded-xl text-sm transition"
                  >
                    {submitting ? "Publishing..." : editingEcoId ? "Save EcoPulse Changes" : "Publish to EcoPulse"}
                  </button>
                </form>
              </div>

              {/* Manage EcoPulse List */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold text-emerald-950 mb-4">Manage EcoPulse Posts</h3>
                <div className="space-y-3">
                  {ecoPulsePosts.map((post) => (
                    <div key={post._id} className="p-4 rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-gray-900">{post.title}</h4>
                        <span className="text-xs text-emerald-700 font-semibold uppercase">{post.type} • {post.category || "General"}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleEditEco(post)} className="p-2 text-emerald-700 hover:bg-emerald-100 rounded-lg">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDeleteEco(post._id)} className="p-2 text-rose-600 hover:bg-rose-100 rounded-lg">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 6. NATURE SNAPS TAB (WITH EDIT / DELETE) */}
          {activeTab === "snaps" && (
            <div className="space-y-8 animate-in fade-in">
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-black text-emerald-950 flex items-center gap-2">
                    <Camera className="text-emerald-600" /> {editingSnapId ? "Edit Nature Snap" : "Post Nature Snap Feature"}
                  </h2>
                  {editingSnapId && (
                    <button 
                      onClick={() => {
                        setEditingSnapId(null);
                        setSnapForm({ title: "", photographer: "", imageUrl: "", type: "winner", description: "" });
                      }}
                      className="text-xs text-rose-600 font-bold hover:underline flex items-center gap-1"
                    >
                      <X className="h-3 w-3" /> Cancel Edit
                    </button>
                  )}
                </div>

                <form onSubmit={handleSnapSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <select
                      value={snapForm.type}
                      onChange={(e) => setSnapForm({ ...snapForm, type: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold outline-none focus:border-emerald-600"
                    >
                      <option value="winner">Main Pic of the Week (Winner)</option>
                      <option value="top_submission">Top Honorable Mention</option>
                    </select>
                    <input
                      type="text"
                      required
                      placeholder="Photo Title (e.g. Morning Mist at Karuru Falls)"
                      value={snapForm.title}
                      onChange={(e) => setSnapForm({ ...snapForm, title: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      required
                      placeholder="Photographer's Name (e.g. Elijah Mutua)"
                      value={snapForm.photographer}
                      onChange={(e) => setSnapForm({ ...snapForm, photographer: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600"
                    />
                    <input
                      type="url"
                      required
                      placeholder="Direct Image URL (https://...)"
                      value={snapForm.imageUrl}
                      onChange={(e) => setSnapForm({ ...snapForm, imageUrl: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600"
                    />
                  </div>

                  <textarea
                    rows={3}
                    placeholder="Photo description, location, or species identified..."
                    value={snapForm.description}
                    onChange={(e) => setSnapForm({ ...snapForm, description: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600"
                  />

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold py-3.5 rounded-xl text-sm transition"
                  >
                    {submitting ? "Processing..." : editingSnapId ? "Save Snap Changes" : "Publish to Nature Snaps"}
                  </button>
                </form>
              </div>

              {/* Manage Snaps List */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold text-emerald-950 mb-4">Manage Nature Snaps</h3>
                <div className="space-y-3">
                  {snaps.map((snap) => (
                    <div key={snap._id} className="p-4 rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-gray-900">{snap.title}</h4>
                        <span className="text-xs text-emerald-700 font-semibold">{snap.photographer} • {snap.type}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleEditSnap(snap)} className="p-2 text-emerald-700 hover:bg-emerald-100 rounded-lg">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDeleteSnap(snap._id)} className="p-2 text-rose-600 hover:bg-rose-100 rounded-lg">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 7. LEADERS TAB (WITH EDIT / DELETE) */}
          {activeTab === "leaders" && (
            <div className="space-y-8 animate-in fade-in">
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-black text-emerald-950 flex items-center gap-2">
                    <Crown className="text-emerald-600" /> {editingLeaderId ? "Edit Leader Profile" : "Add Executive Leader"}
                  </h2>
                  {editingLeaderId && (
                    <button 
                      onClick={() => {
                        setEditingLeaderId(null);
                        setLeaderForm({ name: "", role: "", bio: "", imageUrl: "", order: 1 });
                      }}
                      className="text-xs text-rose-600 font-bold hover:underline flex items-center gap-1"
                    >
                      <X className="h-3 w-3" /> Cancel Edit
                    </button>
                  )}
                </div>

                <form onSubmit={handleLeaderSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      required
                      placeholder="Full Name (e.g. Victor, Grace, Hannah)"
                      value={leaderForm.name}
                      onChange={(e) => setLeaderForm({ ...leaderForm, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Role (e.g. Chairman, Treasurer, PR Leader)"
                      value={leaderForm.role}
                      onChange={(e) => setLeaderForm({ ...leaderForm, role: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="url"
                      placeholder="Profile Photo URL (https://...)"
                      value={leaderForm.imageUrl}
                      onChange={(e) => setLeaderForm({ ...leaderForm, imageUrl: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600"
                    />
                    <input
                      type="number"
                      placeholder="Display Hierarchy Order (1 for Chairman, 2, 3...)"
                      value={leaderForm.order}
                      onChange={(e) => setLeaderForm({ ...leaderForm, order: Number(e.target.value) })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600"
                    />
                  </div>

                  <textarea
                    rows={3}
                    placeholder="Short bio, responsibilities, or vision..."
                    value={leaderForm.bio}
                    onChange={(e) => setLeaderForm({ ...leaderForm, bio: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600"
                  />

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold py-3.5 rounded-xl text-sm transition"
                  >
                    {submitting ? "Processing..." : editingLeaderId ? "Save Leader Changes" : "Save Leader Profile"}
                  </button>
                </form>
              </div>

              {/* Manage Leaders List */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold text-emerald-950 mb-4">Current Executive Team</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {leaders.map((ldr) => (
                    <div key={ldr._id} className="p-4 rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <img 
                          src={ldr.imageUrl || "https://i.postimg.cc/qB9gLwmz/Whats-App-Image-2026-09-03-at-09-49-04.jpg"} 
                          alt={ldr.name} 
                          className="w-10 h-10 rounded-full object-cover border shrink-0"
                        />
                        <div className="truncate">
                          <h4 className="font-bold text-sm text-gray-900 truncate">{ldr.name}</h4>
                          <p className="text-xs text-emerald-700 font-semibold truncate">{ldr.role}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0 ml-2">
                        <button onClick={() => handleEditLeader(ldr)} className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDeleteLeader(ldr._id)} className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 8. BROADCASTS TAB */}
          {activeTab === "broadcast" && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 animate-in fade-in">
              <h2 className="text-2xl font-black text-emerald-950 mb-2 flex items-center gap-2">
                <Megaphone className="text-emerald-600" /> Mass Broadcast Announcement
              </h2>
              <p className="text-sm text-gray-500 mb-6">Dispatches an announcement to every member's student email and in-app notification bell.</p>

              <form onSubmit={handleBroadcast} className="space-y-4">
                <input
                  type="text"
                  required
                  placeholder="Broadcast Title"
                  value={broadcastData.title}
                  onChange={(e) => setBroadcastData({ ...broadcastData, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600"
                />

                <textarea
                  rows={5}
                  required
                  placeholder="Full message content to all students..."
                  value={broadcastData.message}
                  onChange={(e) => setBroadcastData({ ...broadcastData, message: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="url"
                    placeholder="Accompanying Flyer/Image URL"
                    value={broadcastData.imageUrl}
                    onChange={(e) => setBroadcastData({ ...broadcastData, imageUrl: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600"
                  />
                  <input
                    type="url"
                    placeholder="Action Link (https://...)"
                    value={broadcastData.link}
                    onChange={(e) => setBroadcastData({ ...broadcastData, link: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold py-3.5 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-md"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  <span>Broadcast to All Members</span>
                </button>
              </form>
            </div>
          )}

          {/* 9. FEEDBACK & INQUIRIES TAB */}
          {activeTab === "feedback" && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 animate-in fade-in">
              <h2 className="text-2xl font-black text-emerald-950 mb-2 flex items-center gap-2">
                <MessageSquare className="text-emerald-600" /> Student Inquiries & Support Messages
              </h2>
              <p className="text-sm text-gray-500 mb-6">Direct student feedback and inquiries logged from the support form.</p>

              {feedbacks.length === 0 ? (
                <div className="text-center py-12 text-gray-400 font-medium bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  No feedback or inquiries logged.
                </div>
              ) : (
                <div className="space-y-4">
                  {feedbacks.map((item) => (
                    <div key={item._id} className="p-5 rounded-2xl border border-gray-200 bg-gray-50 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <h4 className="font-bold text-gray-900">{item.subject}</h4>
                        <span className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-xs font-semibold text-emerald-700">
                        From: {item.fullName} ({item.email})
                      </p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap bg-white p-4 rounded-xl border border-gray-100">
                        {item.message}
                      </p>
                      <div className="pt-2">
                        <a
                          href={`mailto:${item.email}?subject=Re: ${encodeURIComponent(item.subject)}`}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-800"
                        >
                          <Send className="h-3 w-3" /> Reply directly via Student Email
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
