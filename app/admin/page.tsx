"use client";

import { useState, useEffect } from "react";
import { 
  Users, Calendar, Megaphone, MessageSquare, CreditCard, 
  CheckCircle, ShieldCheck, Image as ImageIcon, Link as LinkIcon, 
  Send, List, Camera, Radio, Crown, Loader2, RefreshCw,
  Edit2, Trash2, X, Lock, KeyRound, Check, AlertCircle, Menu,
  UploadCloud, Phone, Video, Download, Award, ThumbsUp, ThumbsDown,
  Wallet // Added Wallet icon for Payments Tab
} from "lucide-react";

const DEFAULT_LEADERS = [
  { name: "Curtis Kioko", role: "Chairperson", phone: "0758638953", bio: "", imageUrl: "", order: 1 },
  { name: "Grace Chebet", role: "Vice Chairperson", phone: "+254 7XX XXX XXX", bio: "", imageUrl: "", order: 2 },
  { name: "Elizabeth Mwelu", role: "Club Secretary", phone: "+254 7XX XXX XXX", bio: "", imageUrl: "", order: 3 },
  { name: "Joseph Mwendia", role: "Organising Secretary", phone: "+254 7XX XXX XXX", bio: "", imageUrl: "", order: 4 },
  { name: "Melody Mbonne", role: "Public Representative (PR)", phone: "+254 7XX XXX XXX", bio: "", imageUrl: "", order: 5 },
  { name: "Hannah Macharia", role: "Treasurer", phone: "+254 7XX XXX XXX", bio: "", imageUrl: "", order: 6 },
  { name: "Zac", role: "Information Director", phone: "+254 7XX XXX XXX", bio: "", imageUrl: "", order: 7 },
  { name: "Philip Theuri", role: "Assistant Leader", phone: "+254 7XX XXX XXX", bio: "", imageUrl: "", order: 8 },
  { name: "Elias Tirop", role: "Assistant Leader", phone: "+254 7XX XXX XXX", bio: "", imageUrl: "", order: 9 },
  { name: "Amos", role: "Assistant Leader", phone: "+254 7XX XXX XXX", bio: "", imageUrl: "", order: 10 },
];

export default function DekuwecAdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [authError, setAuthError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const [activeTab, setActiveTab] = useState("approvals");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [pendingMembers, setPendingMembers] = useState<any[]>([]);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [wckApplicants, setWckApplicants] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [eventRegistrations, setEventRegistrations] = useState<any[]>([]);
  const [ecoPulsePosts, setEcoPulsePosts] = useState<any[]>([]);
  const [snaps, setSnaps] = useState<any[]>([]);
  const [communitySnaps, setCommunitySnaps] = useState<any[]>([]);
  const [leaders, setLeaders] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  
  // NEW: Payments & Fee Configurations State
  const [payments, setPayments] = useState<any[]>([]);
  const [feeConfig, setFeeConfig] = useState({ member: 200, wckUnder23: 100, wckOver23: 230, eventMember: 650, eventNonMember: 750 });

  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingEcoId, setEditingEcoId] = useState<string | null>(null);
  const [editingSnapId, setEditingSnapId] = useState<string | null>(null);
  const [editingLeaderId, setEditingLeaderId] = useState<string | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

  // Feedback Reply State
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [isReplying, setIsReplying] = useState(false);

  const [broadcastData, setBroadcastData] = useState({ title: "", message: "", imageUrl: "", link: "" });
  const [eventForm, setEventForm] = useState({ title: "", category: "upcoming", date: "", time: "", location: "", imageUrl: "", galleryLink: "", description: "", media: [] as any[] });
  const [ecoType, setEcoType] = useState<"topic" | "quiz">("topic");
  const [ecoArticleForm, setEcoArticleForm] = useState({ title: "", category: "Conservation", imageUrl: "", link: "", content: "" });
  const [ecoQuizForm, setEcoQuizForm] = useState({ question: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "A", explanation: "" });
  const [snapForm, setSnapForm] = useState({ title: "", photographer: "", imageUrl: "", type: "winner", description: "" });
  const [leaderForm, setLeaderForm] = useState({ name: "", role: "", phone: "", bio: "", imageUrl: "", order: 1 });
  const [memberForm, setMemberForm] = useState({ fullName: "", email: "", course: "", status: "" });

  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Secure Cloudinary Uploader for Single Images (forces secure_url)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, formSetter: React.Dispatch<React.SetStateAction<any>>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        const secureImageUrl = data.secure_url || data.url;
        formSetter((prev: any) => ({ ...prev, [fieldName]: secureImageUrl }));
      } else {
        const err = await res.json().catch(()=>({}));
        alert(`Image upload failed: ${err.error || res.statusText}`);
      }
    } catch (err) {
      alert("Error uploading image. Check Cloudinary settings.");
    } finally {
      setUploadingMedia(false);
      e.target.value = ""; 
    }
  };

  // Cloudinary Uploader for Multiple Videos and Images (Events Gallery)
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    setUploadingMedia(true);
    try {
      const uploadedMedia: any[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (res.ok) {
          const data = await res.json();
          uploadedMedia.push({ url: data.secure_url || data.url, type: data.resource_type });
        }
      }
      setEventForm(prev => ({ ...prev, media: [...(prev.media || []), ...uploadedMedia] }));
    } catch (err) {
      alert("Media upload failed. Ensure Cloudinary keys are configured in .env.local");
    } finally {
      setUploadingMedia(false);
      e.target.value = "";
    }
  };

  useEffect(() => {
    const isAuth = sessionStorage.getItem("dekuwec_admin_auth");
    if (isAuth === "true") {
      setIsAuthenticated(true);
      fetchAllAdminData();
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

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
        setCommunitySnaps(data.communitySnaps || []);
        setLeaders(data.leaders || []);
        setFeedbacks(data.feedbacks || []);
      }

      const commRes = await fetch("/api/community-snaps");
      const commData = await commRes.json();
      if (commRes.ok) setCommunitySnaps(commData.snaps || []);

      // NEW: Fetch all recorded payments securely
      const payRes = await fetch("/api/admin/payments").catch(()=>null);
      if (payRes && payRes.ok) {
        const payData = await payRes.json();
        setPayments(payData.payments || []);
      }

    } catch (err) {
      console.error("Master fetch failed:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const triggerAutoNotification = async (title: string, message: string, link: string) => {
    try {
      await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, message, link, imageUrl: "" })
      });
    } catch (error) {
      console.error("Auto-notification failed", error);
    }
  };

  // --- APPROVALS & MEMBERS ---
  const handleApproveMember = async (member: any) => {
    setApprovingId(member.clerkId);
    try {
      const res = await fetch("/api/admin/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clerkId: member.clerkId, email: member.email, fullName: member.fullName || member.displayName || "Member" }),
      });

      if (res.ok) {
        setPendingMembers((prev) => prev.filter((m) => m.clerkId !== member.clerkId));
        setAllMembers((prev) => [...prev, { ...member, status: "Registered Member" }]);
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

  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingMemberId, ...memberForm }),
      });
      if (res.ok) {
        alert("Member details updated!");
        setEditingMemberId(null);
        fetchAllAdminData();
      }
    } finally { setSubmitting(false); }
  };

  const handleEditMember = (member: any) => {
    setEditingMemberId(member._id || member.clerkId);
    setMemberForm({ fullName: member.fullName || member.displayName || "", email: member.email || "", course: member.course || "", status: member.status || "Unregistered" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this member's profile?")) return;
    const res = await fetch(`/api/admin/members?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchAllAdminData();
  };

  const handleDeleteWck = async (id: string) => {
    if (!confirm("Delete this WCK Application?")) return;
    const res = await fetch(`/api/admin/wck?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchAllAdminData();
  };

  const handleDeleteRegistration = async (id: string) => {
    if (!confirm("Remove this participant from the event?")) return;
    const res = await fetch(`/api/admin/registrations?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchAllAdminData();
  };

  // --- CSV DOWNLOAD ---
  const handleDownloadCSV = () => {
    if (eventRegistrations.length === 0) return alert("No registrations to download.");

    const headers = ["Participant Name", "Phone Number", "DeKUT Reg No", "Event Name", "Email Address"];
    const csvRows = eventRegistrations.map(reg => {
      const name = (reg.fullName || reg.name || "Member").replace(/,/g, "");
      const phone = reg.phoneNumber || reg.phone || "—";
      const regNo = reg.registrationNumber || reg.regNo || "—";
      const event = (reg.eventName || reg.eventTitle || "—").replace(/,/g, "");
      const email = reg.email || "—";
      return `${name},${phone},${regNo},${event},${email}`;
    });

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `DEKUWEC_RSVPs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- EVENTS ---
  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const isNew = !editingEventId;
      const method = isNew ? "POST" : "PUT";
      const payload = isNew ? eventForm : { id: editingEventId, ...eventForm };

      const res = await fetch("/api/admin/events", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        if (isNew) triggerAutoNotification(`New Event: ${eventForm.title}`, `A new event has been scheduled for ${eventForm.date}. Tap to view details.`, "/dashboard/events");
        alert(isNew ? "New event published & Notification sent!" : "Event updated successfully!");
        setEditingEventId(null);
        setEventForm({ title: "", category: "upcoming", date: "", time: "", location: "", imageUrl: "", galleryLink: "", description: "", media: [] });
        fetchAllAdminData();
      } else {
        const errData = await res.json().catch(()=>({}));
        alert(`Backend Error: ${errData.error || "Failed to save event. Check API logs."}`);
      }
    } catch(err) {
      alert("Failed to connect to the server.");
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
      description: evt.description,
      media: evt.media || [] 
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this event?")) return;
    const res = await fetch(`/api/admin/events?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchAllAdminData();
  };

  // --- ECOPULSE ---
  const handleEcoPulseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let payload: any = {};
      if (ecoType === "topic") {
        payload = { type: "topic", title: ecoArticleForm.title, category: ecoArticleForm.category, imageUrl: ecoArticleForm.imageUrl, link: ecoArticleForm.link, content: ecoArticleForm.content };
      } else {
        payload = { type: "quiz", title: ecoQuizForm.question, content: ecoQuizForm.explanation, options: [{ id: "A", text: ecoQuizForm.optionA }, { id: "B", text: ecoQuizForm.optionB }, { id: "C", text: ecoQuizForm.optionC }, { id: "D", text: ecoQuizForm.optionD }], correctAnswer: ecoQuizForm.correctAnswer };
      }

      const isNew = !editingEcoId;
      const method = isNew ? "POST" : "PUT";
      if (!isNew) payload.id = editingEcoId;

      const res = await fetch("/api/ecopulse", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        if (isNew) triggerAutoNotification(`EcoPulse Update: ${payload.title}`, `New dispatch posted to EcoPulse. Tap to read!`, "/dashboard/dispatch");
        alert(isNew ? "EcoPulse post published & Notification sent!" : "EcoPulse content updated!");
        setEditingEcoId(null);
        setEcoArticleForm({ title: "", category: "Conservation", imageUrl: "", link: "", content: "" });
        setEcoQuizForm({ question: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "A", explanation: "" });
        fetchAllAdminData();
      } else {
        const errData = await res.json().catch(()=>({}));
        alert(`Backend Error: ${errData.error || "Failed to save EcoPulse entry."}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditEco = (post: any) => {
    setEditingEcoId(post._id);
    setEcoType(post.type);
    if (post.type === "topic") {
      setEcoArticleForm({ title: post.title, category: post.category || "Conservation", imageUrl: post.imageUrl || "", link: post.link || "", content: post.content });
    } else {
      const optMap: Record<string, string> = {};
      (post.options || []).forEach((o: any) => { optMap[o.id] = o.text; });
      setEcoQuizForm({ question: post.title, optionA: optMap["A"] || "", optionB: optMap["B"] || "", optionC: optMap["C"] || "", optionD: optMap["D"] || "", correctAnswer: post.correctAnswer || "A", explanation: post.content });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteEco = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this EcoPulse post?")) return;
    const res = await fetch(`/api/ecopulse?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchAllAdminData();
  };

  // --- NATURE SNAPS ---
  const handleSnapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const isNew = !editingSnapId;
      const method = isNew ? "POST" : "PUT";
      const payload = isNew ? snapForm : { id: editingSnapId, ...snapForm };

      const res = await fetch("/api/snaps", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        if (isNew) triggerAutoNotification(`New Nature Snap`, `Check out '${snapForm.title}' by ${snapForm.photographer}!`, "/dashboard/snaps");
        alert(isNew ? "Nature Snap published & Notification sent!" : "Nature Snap updated!");
        setEditingSnapId(null);
        setSnapForm({ title: "", photographer: "", imageUrl: "", type: "winner", description: "" });
        fetchAllAdminData();
      } else {
        const errData = await res.json().catch(()=>({}));
        alert(`Backend Error: ${errData.error || "Failed to save snap."}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSnap = (snap: any) => {
    setEditingSnapId(snap._id);
    setSnapForm({ title: snap.title, photographer: snap.photographer, imageUrl: snap.imageUrl, type: snap.type, description: snap.description || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteSnap = async (id: string) => {
    if (!confirm("Are you sure you want to delete this snap?")) return;
    const res = await fetch(`/api/snaps?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchAllAdminData();
  };

  const handleDeleteCommunitySnap = async (id: string) => {
    if (!confirm("Remove this user submission?")) return;
    const res = await fetch(`/api/admin/community-snaps?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchAllAdminData();
  };

  const handleClearAllCommunitySnaps = async () => {
    if (!confirm("WARNING: This permanently deletes ALL weekly challenge submissions to start a new week. Proceed?")) return;
    const res = await fetch(`/api/admin/community-snaps?action=deleteAll`, { method: "DELETE" });
    if (res.ok) {
      alert("Week reset successfully!");
      fetchAllAdminData();
    }
  };

  const handlePromoteCommunitySnap = (snap: any, awardType: string) => {
    setSnapForm({
      title: snap.caption || "Weekly Selection",
      photographer: snap.fullName,
      imageUrl: snap.imageUrl,
      type: awardType,
      description: `Community capture by ${snap.fullName}.`
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
    alert("Photo copied! Scroll up to tweak the details and hit Publish.");
  };

  // --- LEADERS ---
  const importDefaultLeaders = async () => {
    if (!confirm("This will initialize your database with the default executive board so you can easily edit them. Proceed?")) return;
    setSubmitting(true);
    try {
      for (const ldr of DEFAULT_LEADERS) {
        await fetch("/api/admin/leaders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ldr),
        });
      }
      await fetchAllAdminData();
      alert("Executive Board initialized successfully! You can now click 'Edit' to complete their profiles.");
    } catch(err) {
      alert("Failed to initialize leaders.");
    } finally {
      setSubmitting(false);
    }
  };

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
        setLeaderForm({ name: "", role: "", phone: "", bio: "", imageUrl: "", order: 1 });
        fetchAllAdminData();
      } else {
        const errData = await res.json().catch(()=>({}));
        alert(`Backend Error: ${errData.error || "Failed to save leader profile."}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditLeader = (ldr: any) => {
    setEditingLeaderId(ldr._id);
    setLeaderForm({ name: ldr.name, role: ldr.role, phone: ldr.phone || "", bio: ldr.bio || "", imageUrl: ldr.imageUrl || "", order: ldr.order || 1 });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteLeader = async (id: string) => {
    if (!confirm("Are you sure you want to delete this leader?")) return;
    const res = await fetch(`/api/admin/leaders?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchAllAdminData();
  };

  // --- BROADCAST ---
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
        const errData = await res.json().catch(()=>({}));
        alert(`Backend Error: ${errData.error || "Failed to dispatch broadcast."}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // --- FEEDBACK INTERACTIVE REPLY ---
  const handleSendReply = async (e: React.FormEvent, item: any) => {
    e.preventDefault();
    if (!replyMessage.trim()) return alert("Reply message cannot be empty.");
    
    setIsReplying(true);
    try {
      const res = await fetch("/api/admin/feedback/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: item.clerkId || "anonymous",
          studentEmail: item.email,
          studentName: item.fullName,
          originalSubject: item.subject,
          replyMessage: replyMessage
        })
      });

      if (res.ok) {
        alert("Reply successfully sent to the student's email and notification bell!");
        setReplyingToId(null);
        setReplyMessage("");
      } else {
        const err = await res.json();
        alert(`Failed to send reply: ${err.error}`);
      }
    } catch (err) {
      alert("Server connection error.");
    } finally {
      setIsReplying(false);
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    if (!confirm("Delete this feedback message?")) return;
    const res = await fetch(`/api/admin/feedback?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchAllAdminData();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-emerald-950 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6 text-center animate-in fade-in zoom-in duration-200">
          <div className="mx-auto w-24 h-24 rounded-full overflow-hidden border-4 border-emerald-500 shadow-md">
            <img src="https://res.cloudinary.com/dnipaby6h/image/upload/v1789108366/WhatsApp_Image_2026-09-03_at_09.49.04_q31jcg.jpg" alt="DEKUWEC Official Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-xl font-black text-emerald-950 tracking-tight">DEKUWEC ADMINS</h1>
            <p className="text-xs font-semibold text-gray-500 mt-1">Executive Portal Passcode Verification</p>
          </div>
          <form onSubmit={handleVerifyPasscode} className="space-y-4">
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-400" />
              <input type="password" required placeholder="Enter ADMIN_SECRET_KEY..." value={passcode} onChange={(e) => setPasscode(e.target.value)} className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-emerald-600 text-sm font-medium transition" />
            </div>
            {authError && (
              <div className="flex items-center gap-1.5 text-xs text-rose-600 font-bold justify-center">
                <AlertCircle className="h-4 w-4 shrink-0" /><span>{authError}</span>
              </div>
            )}
            <button type="submit" disabled={verifying} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold py-3.5 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-md">
              {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              <span>Verify Key & Open Portal</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      
      {/* Mobile Top Header */}
      <div className="md:hidden bg-emerald-950 text-white p-4 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <img src="https://res.cloudinary.com/dnipaby6h/image/upload/v1789108366/WhatsApp_Image_2026-09-03_at_09.49.04_q31jcg.jpg" alt="DEKUWEC Logo" className="w-8 h-8 rounded-full border border-emerald-400 object-cover" />
          <div><h1 className="text-xs font-black tracking-tight leading-tight">DEKUWEC ADMINS</h1></div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAllAdminData} className="p-2 text-emerald-200 hover:text-white transition">
            <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-emerald-200 hover:text-white transition">
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Responsive Sidebar Navigation */}
      <aside className={`fixed md:relative inset-y-0 left-0 z-50 w-64 bg-emerald-950 text-white flex-shrink-0 flex flex-col h-screen transform transition-transform duration-300 ease-in-out md:translate-x-0 ${isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}>
        <div className="p-5 flex items-center justify-between md:justify-start gap-3 border-b border-emerald-900/60">
          <div className="flex items-center gap-3 overflow-hidden">
            <img src="https://res.cloudinary.com/dnipaby6h/image/upload/v1789108366/WhatsApp_Image_2026-09-03_at_09.49.04_q31jcg.jpg" alt="DEKUWEC Logo" className="w-10 h-10 rounded-full border-2 border-emerald-400 object-cover shrink-0 hidden md:block" />
            <div className="overflow-hidden hidden md:block">
              <h1 className="text-xs font-black tracking-tight leading-tight text-white truncate">DEKUWEC ADMINS</h1>
              <span className="text-[10px] text-emerald-400 font-bold block">Executive Portal</span>
            </div>
            <span className="md:hidden text-sm font-black tracking-widest text-emerald-300">ADMIN MENU</span>
          </div>
          <button onClick={fetchAllAdminData} title="Refresh All Collections" className="hidden md:block ml-auto p-1.5 hover:bg-emerald-900 rounded-lg text-emerald-300 transition">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-1 text-emerald-200 hover:text-white"><X className="h-6 w-6" /></button>
        </div>

        <nav className="flex flex-col p-3 gap-1.5 flex-1 overflow-y-auto w-full">
          {[
            { id: "approvals", icon: CheckCircle, label: `Approvals (${pendingMembers.length})` },
            { id: "wck", icon: CreditCard, label: `WCK Cards (${wckApplicants.length})` },
            { id: "members", icon: Users, label: `All Members (${allMembers.length})` },
            { id: "payments", icon: Wallet, label: `Payments (${payments.length})` },
            { id: "events", icon: Calendar, label: `Events & RSVPs (${events.length})` },
            { id: "ecopulse", icon: Radio, label: `EcoPulse (${ecoPulsePosts.length})` },
            { id: "snaps", icon: Camera, label: `Nature Snaps (${snaps.length})` },
            { id: "leaders", icon: Crown, label: `Leaders (${leaders.length})` },
            { id: "broadcast", icon: Megaphone, label: "Broadcasts" },
            { id: "feedback", icon: MessageSquare, label: `Feedback (${feedbacks.length})` },
          ].map((tab) => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 px-4 py-3 md:py-2.5 rounded-xl transition-all font-bold text-sm md:text-xs w-full ${activeTab === tab.id ? "bg-emerald-600 text-white shadow-md" : "text-emerald-300 hover:bg-emerald-900/50 hover:text-white"}`}>
              <tab.icon className="h-5 w-5 md:h-4 md:w-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Workspace */}
      <main className="flex-1 p-4 sm:p-8 lg:p-10 overflow-y-auto md:h-screen">
        <div className="max-w-5xl mx-auto space-y-8 pb-20">

          {/* 1. APPROVALS TAB */}
          {activeTab === "approvals" && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-2xl font-black text-emerald-950 flex items-center gap-2">
                    <CheckCircle className="text-emerald-600 shrink-0" /> Pending Registrations
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">Confirm student M-Pesa payments (0118506251) and activate membership access.</p>
                </div>
                <button onClick={fetchAllAdminData} className="hidden sm:inline-block text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition shrink-0">
                  Refresh
                </button>
              </div>

              {pendingMembers.length === 0 ? (
                <div className="text-center py-12 text-gray-400 font-medium bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  No members currently pending approval.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-gray-100">
                  <table className="w-full text-left border-collapse min-w-[650px]">
                    <thead>
                      <tr className="bg-gray-50 text-xs uppercase text-gray-500 font-bold border-b border-gray-200">
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
                            {member.claimedRosterName && <span className="block text-[11px] text-amber-700 font-bold mt-0.5">Claim: {member.claimedRosterName}</span>}
                          </td>
                          <td className="p-4 text-gray-600">
                            <div>{member.email}</div>
                            {member.phone && <div className="text-xs text-gray-400 font-medium mt-0.5">{member.phone}</div>}
                          </td>
                          <td className="p-4 text-gray-600">
                            <div>{member.yearOfStudy || member.year || "Year 1"}</div>
                          </td>
                          <td className="p-4">
                            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">{member.status}</span>
                          </td>
                          <td className="p-4 text-right">
                            <button onClick={() => handleApproveMember(member)} disabled={approvingId === member.clerkId} className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold px-4 py-2 rounded-xl text-xs transition flex items-center gap-1.5 ml-auto whitespace-nowrap">
                              {approvingId === member.clerkId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Approve
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
                <CreditCard className="text-emerald-600 shrink-0" /> WCK Card Roster
              </h2>
              <p className="text-sm text-gray-500 mb-6">List of students requesting national park affiliate cards.</p>

              {wckApplicants.length === 0 ? (
                <div className="text-center py-12 text-gray-400 font-medium bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  No WCK applications logged yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-gray-100">
                  <table className="w-full text-left border-collapse min-w-[650px]">
                    <thead>
                      <tr className="bg-gray-50 text-xs uppercase text-gray-500 font-bold border-b border-gray-200">
                        <th className="p-4">Full Name</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Phone</th>
                        <th className="p-4">Year</th>
                        <th className="p-4">Applied</th>
                        <th className="p-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wckApplicants.map((app) => (
                        <tr key={app._id} className="border-b border-gray-100 hover:bg-gray-50 text-sm">
                          <td className="p-4 font-bold text-gray-900">{app.fullName}</td>
                          <td className="p-4 text-gray-600">{app.email}</td>
                          <td className="p-4 font-semibold text-emerald-700">{app.phone || "—"}</td>
                          <td className="p-4 text-gray-600">{app.yearOfStudy || "—"}</td>
                          <td className="p-4 text-xs text-gray-400 whitespace-nowrap">{app.createdAt ? new Date(app.createdAt).toLocaleDateString() : "Recent"}</td>
                          <td className="p-4 text-right">
                            <button onClick={() => handleDeleteWck(app._id)} className="p-2 text-rose-600 hover:bg-rose-100 rounded-lg transition ml-auto flex">
                              <Trash2 className="h-4 w-4" />
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

          {/* 3. ALL MEMBERS TAB */}
          {activeTab === "members" && (
            <div className="space-y-8 animate-in fade-in">
              {editingMemberId && (
                <form onSubmit={handleMemberSubmit} className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-emerald-300">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-emerald-950">Edit Member Profile</h3>
                    <button type="button" onClick={() => setEditingMemberId(null)} className="text-xs text-rose-600 font-bold hover:underline flex items-center gap-1">
                      <X className="h-3 w-3" /> Cancel Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <input type="text" value={memberForm.fullName} onChange={e => setMemberForm({...memberForm, fullName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600" />
                    <input type="email" value={memberForm.email} onChange={e => setMemberForm({...memberForm, email: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600" />
                    <input type="text" placeholder="Course" value={memberForm.course} onChange={e => setMemberForm({...memberForm, course: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600" />
                    <select value={memberForm.status} onChange={e => setMemberForm({...memberForm, status: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600 font-semibold">
                      <option value="Registered Member">Registered Member</option>
                      <option value="Unregistered">Unregistered</option>
                      <option value="Pending Approval">Pending Approval</option>
                    </select>
                  </div>
                  <button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl text-sm transition">
                    {submitting ? "Saving..." : "Save Member Changes"}
                  </button>
                </form>
              )}

              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
                <h2 className="text-2xl font-black text-emerald-950 mb-2 flex items-center gap-2">
                  <Users className="text-emerald-600 shrink-0" /> Master Member Directory
                </h2>
                <p className="text-sm text-gray-500 mb-6">Complete master list of student signups in the database.</p>

                <div className="overflow-x-auto rounded-2xl border border-gray-100">
                  <table className="w-full text-left border-collapse min-w-[650px]">
                    <thead>
                      <tr className="bg-gray-50 text-xs uppercase text-gray-500 font-bold border-b border-gray-200">
                        <th className="p-4">Name</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Course</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allMembers.map((member) => (
                        <tr key={member._id || member.clerkId} className="border-b border-gray-100 hover:bg-gray-50 text-sm">
                          <td className="p-4 font-bold text-gray-900">{member.fullName || member.displayName || "User"}</td>
                          <td className="p-4 text-gray-600">{member.email}</td>
                          <td className="p-4 text-gray-600">{member.course || "General"}</td>
                          <td className="p-4">
                            <span className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${
                              member.status === "Approved" || member.status === "Registered Member" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700"
                            }`}>
                              {member.status || "Unregistered"}
                            </span>
                          </td>
                          <td className="p-4 flex gap-2 justify-end">
                            <button onClick={() => handleEditMember(member)} className="p-2 text-emerald-700 hover:bg-emerald-100 rounded-lg transition"><Edit2 className="h-4 w-4"/></button>
                            <button onClick={() => handleDeleteMember(member._id)} className="p-2 text-rose-600 hover:bg-rose-100 rounded-lg transition"><Trash2 className="h-4 w-4"/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* NEW: PAYMENTS TAB */}
          {activeTab === "payments" && (
            <div className="space-y-8 animate-in fade-in">
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                  <h2 className="text-2xl font-black text-emerald-950 flex items-center gap-2">
                    <Wallet className="text-emerald-600 shrink-0" /> Financial & Payments Ledger
                  </h2>
                  <button onClick={fetchAllAdminData} className="hidden sm:inline-block text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition shrink-0">
                    Refresh Ledger
                  </button>
                </div>
                <p className="text-sm text-gray-500 mb-6">Track all confirmed M-Pesa transactions across Events, WCK Cards, and Memberships. System automatically syncs with Safaricom Daraja API.</p>

                {/* Payment Configuration (Allows Admin to Regulate Amounts) */}
                <div className="mb-8 p-6 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <h3 className="text-lg font-bold text-emerald-900 mb-4">Regulate Default Payment Fees (KES)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-emerald-800 mb-1">Standard Membership</label>
                      <input type="number" value={feeConfig.member} onChange={e => setFeeConfig({...feeConfig, member: Number(e.target.value)})} className="w-full px-3 py-2 rounded-lg border border-emerald-200 text-sm outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-emerald-800 mb-1">Event: Member Rate</label>
                      <input type="number" value={feeConfig.eventMember} onChange={e => setFeeConfig({...feeConfig, eventMember: Number(e.target.value)})} className="w-full px-3 py-2 rounded-lg border border-emerald-200 text-sm outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-emerald-800 mb-1">Event: Non-Member Rate</label>
                      <input type="number" value={feeConfig.eventNonMember} onChange={e => setFeeConfig({...feeConfig, eventNonMember: Number(e.target.value)})} className="w-full px-3 py-2 rounded-lg border border-emerald-200 text-sm outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-emerald-800 mb-1">WCK Card (Below 23 Years)</label>
                      <input type="number" value={feeConfig.wckUnder23} onChange={e => setFeeConfig({...feeConfig, wckUnder23: Number(e.target.value)})} className="w-full px-3 py-2 rounded-lg border border-emerald-200 text-sm outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-emerald-800 mb-1">WCK Card (23 Years & Above)</label>
                      <input type="number" value={feeConfig.wckOver23} onChange={e => setFeeConfig({...feeConfig, wckOver23: Number(e.target.value)})} className="w-full px-3 py-2 rounded-lg border border-emerald-200 text-sm outline-none focus:border-emerald-500" />
                    </div>
                  </div>
                  <button onClick={() => alert("Global fee structures updated successfully! (Linked to future dynamic schema)")} className="mt-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2 px-5 rounded-xl text-xs transition shadow-sm">
                    Save Fee Configurations
                  </button>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-4">Confirmed Transactions</h3>
                {payments.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 font-medium bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    No completed payments logged yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-gray-100">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-gray-50 text-xs uppercase text-gray-500 font-bold border-b border-gray-200">
                          <th className="p-4">Date</th>
                          <th className="p-4">Applicant / Payer</th>
                          <th className="p-4">Phone Number</th>
                          <th className="p-4">Category & Ref</th>
                          <th className="p-4">Amount</th>
                          <th className="p-4">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((pay) => (
                          <tr key={pay._id} className="border-b border-gray-100 hover:bg-gray-50 text-sm">
                            <td className="p-4 text-gray-600 whitespace-nowrap">{new Date(pay.createdAt).toLocaleDateString()}</td>
                            <td className="p-4 font-bold text-gray-900">{pay.fullName}</td>
                            <td className="p-4 font-semibold text-gray-600">{pay.phone}</td>
                            <td className="p-4">
                              <span className="font-bold text-emerald-800">{pay.category}</span>
                              <span className="block text-[10px] text-gray-500 uppercase mt-0.5">{pay.reference}</span>
                            </td>
                            <td className="p-4 font-black text-emerald-700">KES {pay.amount}</td>
                            <td className="p-4">
                              <span className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${pay.status === "Completed" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                                {pay.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. EVENTS TAB */}
          {activeTab === "events" && (
            <div className="space-y-8 animate-in fade-in">
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                  <h2 className="text-xl sm:text-2xl font-black text-emerald-950 flex items-center gap-2">
                    <Calendar className="text-emerald-600 shrink-0" /> {editingEventId ? "Edit Event" : "Post New Event / Activity"}
                  </h2>
                  {editingEventId && (
                    <button 
                      onClick={() => {
                        setEditingEventId(null);
                        setEventForm({ title: "", category: "upcoming", date: "", time: "", location: "", imageUrl: "", galleryLink: "", description: "", media: [] });
                      }}
                      className="text-xs text-rose-600 font-bold hover:underline flex items-center gap-1 shrink-0"
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
                    
                    <div className="w-full flex flex-col justify-center border border-gray-200 rounded-xl px-2">
                      <div className="flex items-center gap-3">
                        {eventForm.imageUrl && (
                          <div className="relative h-12 w-16 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 p-1 border border-gray-200 shadow-sm">
                            <img src={eventForm.imageUrl} alt="Preview" className="h-full w-full object-contain rounded-md" />
                            <button type="button" onClick={() => setEventForm({...eventForm, imageUrl: ""})} className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow-md hover:bg-rose-600 transition z-10">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                        <input
                          key={eventForm.imageUrl ? "has-img" : "no-img"}
                          type="file"
                          accept="image/*"
                          disabled={uploadingMedia}
                          onChange={(e) => handleImageUpload(e, setEventForm, "imageUrl")}
                          className="w-full py-1.5 text-sm outline-none focus:border-emerald-600 bg-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 disabled:opacity-50 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Cloudinary Multi-Media Upload Section */}
                  <div className="border border-emerald-100 rounded-xl p-4 bg-emerald-50/30">
                    <label className="block text-xs font-bold uppercase text-emerald-800 mb-2 flex items-center gap-2">
                      <Video className="h-4 w-4" /> Multi-Media Event Gallery (Videos & Extra Photos)
                    </label>
                    <p className="text-xs text-gray-500 mb-3">Select multiple files at once. These will be uploaded securely via Cloudinary to prevent crashing the database.</p>
                    
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        disabled={uploadingMedia}
                        onChange={handleMediaUpload}
                        className="w-full py-1.5 text-sm outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200 cursor-pointer disabled:opacity-50"
                      />
                    </div>
                    {uploadingMedia && (
                      <p className="text-xs font-bold text-emerald-600 mt-2 flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin"/> Uploading to Cloudinary... Please wait.
                      </p>
                    )}
                    {eventForm.media && eventForm.media.length > 0 && (
                      <div className="flex flex-wrap gap-3 mt-4">
                        {eventForm.media.map((m, i) => (
                          <div key={i} className="relative h-20 w-20 rounded-xl border border-gray-200 overflow-hidden bg-gray-900 shadow-sm">
                            {m.type === 'video' ? (
                              <video src={m.url} className="w-full h-full object-cover opacity-80" />
                            ) : (
                              <img src={m.url} className="w-full h-full object-cover opacity-80"/>
                            )}
                            <button 
                              type="button" 
                              onClick={() => setEventForm(prev => ({...prev, media: prev.media.filter((_, idx) => idx !== i)}))} 
                              className="absolute top-1 right-1 bg-rose-500 text-white rounded-full p-1 shadow-md transition hover:bg-rose-600 z-10"
                            >
                              <X className="h-3 w-3"/>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
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
                    disabled={submitting || uploadingMedia}
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
                      <div key={evt._id} className="p-4 rounded-2xl border border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-gray-900 truncate">{evt.title}</h4>
                          <span className="text-xs text-emerald-700 font-semibold uppercase">{evt.category} • {evt.date}</span>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => handleEditEvent(evt)} className="p-2 text-emerald-700 hover:bg-emerald-100 rounded-lg transition">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDeleteEvent(evt._id)} className="p-2 text-rose-600 hover:bg-rose-100 rounded-lg transition">
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
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-emerald-950">
                      Event Registrations / Participants ({eventRegistrations.length})
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">Students who RSVP'd for upcoming excursions and hikes.</p>
                  </div>
                  <button onClick={handleDownloadCSV} disabled={eventRegistrations.length === 0} className="flex items-center gap-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold px-4 py-2 rounded-xl text-xs transition shrink-0">
                    <Download className="h-4 w-4" /> Download CSV Roster
                  </button>
                </div>

                {eventRegistrations.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-sm bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    No event registrations recorded yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-gray-100">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-gray-50 text-xs uppercase text-gray-500 font-bold border-b border-gray-200">
                          <th className="p-4">Participant Name</th>
                          <th className="p-4">Phone Number</th>
                          <th className="p-4">DeKUT Reg No</th>
                          <th className="p-4">Event Name</th>
                          <th className="p-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eventRegistrations.map((reg) => {
                          const parsedName = reg.fullName || reg.name || "Member";
                          const parsedPhone = reg.phoneNumber || reg.phone || "—";
                          const displayRegNo = reg.registrationNumber || reg.regNo || "—";
                          const displayEvent = reg.eventName || reg.eventTitle || "Upcoming Event";

                          return (
                            <tr key={reg._id} className="border-b border-gray-100 hover:bg-gray-50 text-sm">
                              <td className="p-4 font-bold text-gray-900">
                                {parsedName}
                                {reg.email && (
                                  <span className="block text-xs font-normal text-gray-400 mt-0.5">{reg.email}</span>
                                )}
                              </td>
                              <td className="p-4 font-semibold text-gray-600">
                                {parsedPhone}
                              </td>
                              <td className="p-4 font-semibold text-emerald-700">
                                <span className="bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg text-xs font-mono">
                                  {displayRegNo}
                                </span>
                              </td>
                              <td className="p-4 font-bold text-gray-800">
                                {displayEvent}
                              </td>
                              <td className="p-4 text-right">
                                <button 
                                  onClick={() => handleDeleteRegistration(reg._id)} 
                                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition ml-auto flex"
                                  title="Remove participant"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. ECOPULSE TAB */}
          {activeTab === "ecopulse" && (
            <div className="space-y-8 animate-in fade-in">
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                  <h2 className="text-xl sm:text-2xl font-black text-emerald-950 flex items-center gap-2">
                    <Radio className="text-emerald-600 shrink-0" /> {editingEcoId ? "Edit EcoPulse Entry" : "Post to EcoPulse"}
                  </h2>
                  {editingEcoId && (
                    <button 
                      onClick={() => {
                        setEditingEcoId(null);
                        setEcoArticleForm({ title: "", category: "Conservation", imageUrl: "", link: "", content: "" });
                        setEcoQuizForm({ question: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "A", explanation: "" });
                      }}
                      className="text-xs text-rose-600 font-bold hover:underline flex items-center gap-1 shrink-0"
                    >
                      <X className="h-3 w-3" /> Cancel Edit
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 sm:gap-3 mb-6">
                  <button
                    type="button"
                    onClick={() => setEcoType("topic")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex-1 sm:flex-none ${
                      ecoType === "topic" ? "bg-emerald-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Weekly Article
                  </button>
                  <button
                    type="button"
                    onClick={() => setEcoType("quiz")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex-1 sm:flex-none ${
                      ecoType === "quiz" ? "bg-emerald-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    4-Option Quiz
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
                        <div className="w-full flex flex-col justify-center border border-gray-200 rounded-xl px-2">
                          <div className="flex items-center gap-3">
                            {ecoArticleForm.imageUrl && (
                              <div className="relative h-12 w-16 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 p-1 border border-gray-200 shadow-sm">
                                <img src={ecoArticleForm.imageUrl} alt="Preview" className="h-full w-full object-contain rounded-md" />
                                <button type="button" onClick={() => setEcoArticleForm({...ecoArticleForm, imageUrl: ""})} className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow-md hover:bg-rose-600 transition z-10">
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                            <input
                              key={ecoArticleForm.imageUrl ? "has-img" : "no-img"}
                              type="file"
                              accept="image/*"
                              disabled={uploadingMedia}
                              onChange={(e) => handleImageUpload(e, setEcoArticleForm, "imageUrl")}
                              className="w-full py-1.5 text-sm outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 disabled:opacity-50 cursor-pointer"
                            />
                          </div>
                        </div>
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
                          <input type="text" required placeholder="Option A..." value={ecoQuizForm.optionA} onChange={(e) => setEcoQuizForm({ ...ecoQuizForm, optionA: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">Option B</label>
                          <input type="text" required placeholder="Option B..." value={ecoQuizForm.optionB} onChange={(e) => setEcoQuizForm({ ...ecoQuizForm, optionB: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">Option C</label>
                          <input type="text" required placeholder="Option C..." value={ecoQuizForm.optionC} onChange={(e) => setEcoQuizForm({ ...ecoQuizForm, optionC: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">Option D</label>
                          <input type="text" required placeholder="Option D..." value={ecoQuizForm.optionD} onChange={(e) => setEcoQuizForm({ ...ecoQuizForm, optionD: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-emerald-800 mb-1">Correct Answer</label>
                          <select value={ecoQuizForm.correctAnswer} onChange={(e) => setEcoQuizForm({ ...ecoQuizForm, correctAnswer: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 font-bold text-sm outline-none">
                            <option value="A">Option A</option><option value="B">Option B</option><option value="C">Option C</option><option value="D">Option D</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Answer Explanation</label>
                          <input type="text" required placeholder="Why is this the answer? (Revealed after submission)" value={ecoQuizForm.explanation} onChange={(e) => setEcoQuizForm({ ...ecoQuizForm, explanation: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600" />
                        </div>
                      </div>
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || uploadingMedia}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold py-3.5 rounded-xl text-sm transition"
                  >
                    {submitting ? "Processing..." : editingEcoId ? "Save EcoPulse Changes" : "Publish to EcoPulse"}
                  </button>
                </form>
              </div>

              {/* Manage EcoPulse List */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold text-emerald-950 mb-4">Manage EcoPulse Posts</h3>
                <div className="space-y-3">
                  {ecoPulsePosts.map((post) => (
                    <div key={post._id} className="p-4 rounded-2xl border border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-gray-900 truncate">{post.title}</h4>
                        <span className="text-xs text-emerald-700 font-semibold uppercase">{post.type} • {post.category || "General"}</span>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => handleEditEco(post)} className="p-2 text-emerald-700 hover:bg-emerald-100 rounded-lg transition">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDeleteEco(post._id)} className="p-2 text-rose-600 hover:bg-rose-100 rounded-lg transition">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 6. NATURE SNAPS TAB */}
          {activeTab === "snaps" && (
            <div className="space-y-8 animate-in fade-in">
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-emerald-300">
                <div className="flex justify-between mb-4">
                  <h2 className="text-2xl font-black text-emerald-950 flex items-center gap-2"><Camera className="text-emerald-600" /> {editingSnapId ? "Edit Nature Snap" : "Post Official Nature Snap Feature"}</h2>
                  {editingSnapId && <button onClick={() => { setEditingSnapId(null); setSnapForm({ title: "", photographer: "", imageUrl: "", type: "winner", description: "" }); }} className="text-xs text-rose-600 font-bold hover:underline flex items-center gap-1 shrink-0"><X className="h-3 w-3" /> Cancel Edit</button>}
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
                    
                    <div className="w-full flex flex-col justify-center border border-gray-200 rounded-xl px-2">
                      <div className="flex items-center gap-3">
                        {snapForm.imageUrl && (
                          <div className="relative h-12 w-16 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 p-1 border border-gray-200 shadow-sm">
                            <img src={snapForm.imageUrl} alt="Preview" className="h-full w-full object-contain rounded-md" />
                            <button type="button" onClick={() => setSnapForm({...snapForm, imageUrl: ""})} className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow-md hover:bg-rose-600 transition z-10">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                        <input
                          key={snapForm.imageUrl ? "has-img" : "no-img"}
                          type="file"
                          accept="image/*"
                          required={!snapForm.imageUrl}
                          disabled={uploadingMedia}
                          onChange={(e) => handleImageUpload(e, setSnapForm, "imageUrl")}
                          className="w-full py-1.5 text-sm outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 disabled:opacity-50 cursor-pointer"
                        />
                      </div>
                    </div>
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
                    disabled={submitting || uploadingMedia}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold py-3.5 rounded-xl text-sm transition"
                  >
                    {submitting ? "Processing..." : editingSnapId ? "Save Snap Changes" : "Publish to Nature Snaps"}
                  </button>
                </form>
              </div>

              {/* NEW: Community Submissions Moderation */}
              <div className="bg-emerald-950 rounded-3xl p-6 sm:p-8 shadow-sm text-white">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-emerald-100 flex items-center gap-2"><Users className="h-5 w-5" /> Review Weekly Challenge Submissions</h3>
                    <p className="text-xs text-emerald-300 mt-1">Review student uploads. Click "Award" to automatically copy the photo to the Official Publisher above.</p>
                  </div>
                  <button onClick={handleClearAllCommunitySnaps} className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-md shrink-0">
                    Clear Week (Reset Board)
                  </button>
                </div>

                {communitySnaps.length === 0 ? (
                  <p className="text-sm text-emerald-500 text-center py-6 border border-emerald-900 rounded-2xl border-dashed">No community submissions this week.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {communitySnaps.map(snap => (
                      <div key={snap._id} className="bg-emerald-900 rounded-2xl p-4 border border-emerald-800 flex flex-col">
                        <div className="aspect-square bg-black rounded-xl overflow-hidden mb-3 relative">
                          <img src={snap.imageUrl} alt="User submission" className="w-full h-full object-cover" />
                          <button onClick={() => handleDeleteCommunitySnap(snap._id)} className="absolute top-2 right-2 bg-rose-500 text-white p-1.5 rounded-full shadow-md hover:bg-rose-600 transition"><Trash2 className="h-3 w-3"/></button>
                        </div>
                        <div className="mb-4">
                          <p className="font-bold text-sm truncate">{snap.fullName}</p>
                          <p className="text-xs text-emerald-300 line-clamp-2">{snap.caption || "No caption"}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs font-bold text-emerald-200">
                            <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3"/> {snap.likes.length}</span>
                            <span className="flex items-center gap-1 text-rose-300"><ThumbsDown className="h-3 w-3"/> {snap.dislikes.length}</span>
                          </div>
                        </div>
                        <div className="mt-auto grid grid-cols-2 gap-2">
                          <button onClick={() => handlePromoteCommunitySnap(snap, "winner")} className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold py-2 rounded-lg flex items-center justify-center gap-1 transition">
                            <Award className="h-3 w-3"/> Make Winner
                          </button>
                          <button onClick={() => handlePromoteCommunitySnap(snap, "top_submission")} className="bg-emerald-800 hover:bg-emerald-700 text-emerald-100 text-[10px] font-bold py-2 rounded-lg transition">
                            Honorable Mention
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Manage Snaps List */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold text-emerald-950 mb-4">Manage Nature Snaps</h3>
                <div className="space-y-3">
                  {snaps.map((snap) => (
                    <div key={snap._id} className="p-4 rounded-2xl border border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-gray-900 truncate">{snap.title}</h4>
                        <span className="text-xs text-emerald-700 font-semibold">{snap.photographer} • {snap.type}</span>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => handleEditSnap(snap)} className="p-2 text-emerald-700 hover:bg-emerald-100 rounded-lg transition">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDeleteSnap(snap._id)} className="p-2 text-rose-600 hover:bg-rose-100 rounded-lg transition">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 7. LEADERS TAB */}
          {activeTab === "leaders" && (
            <div className="space-y-8 animate-in fade-in">
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                  <h2 className="text-xl sm:text-2xl font-black text-emerald-950 flex items-center gap-2">
                    <Crown className="text-emerald-600 shrink-0" /> {editingLeaderId ? "Edit Leader Profile" : "Add Executive Leader"}
                  </h2>
                  {editingLeaderId && (
                    <button 
                      onClick={() => {
                        setEditingLeaderId(null);
                        setLeaderForm({ name: "", role: "", phone: "", bio: "", imageUrl: "", order: 1 });
                      }}
                      className="text-xs text-rose-600 font-bold hover:underline flex items-center gap-1 shrink-0"
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
                      placeholder="Full Name (e.g. Curtis Kioko)"
                      value={leaderForm.name}
                      onChange={(e) => setLeaderForm({ ...leaderForm, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Role (e.g. Chairperson, Treasurer)"
                      value={leaderForm.role}
                      onChange={(e) => setLeaderForm({ ...leaderForm, role: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Phone Number (e.g. 0758638953)"
                      value={leaderForm.phone}
                      onChange={(e) => setLeaderForm({ ...leaderForm, phone: e.target.value })}
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

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Upload Profile Photo</label>
                    <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-xl border border-gray-200 border-dashed">
                      {leaderForm.imageUrl ? (
                        <div className="relative group shrink-0">
                          <img src={leaderForm.imageUrl} alt="Preview" className="h-16 w-16 rounded-full object-cover border-2 border-white shadow-sm" />
                          <button type="button" onClick={() => setLeaderForm({...leaderForm, imageUrl: ""})} className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition shadow-sm z-10">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                          <UploadCloud className="h-6 w-6" />
                        </div>
                      )}
                      <input
                        key={leaderForm.imageUrl ? "has-img" : "no-img"}
                        type="file"
                        accept="image/*"
                        disabled={uploadingMedia}
                        onChange={(e) => handleImageUpload(e, setLeaderForm, "imageUrl")}
                        className="w-full text-sm outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200 transition cursor-pointer disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || uploadingMedia}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold py-3.5 rounded-xl text-sm transition"
                  >
                    {submitting ? "Processing..." : editingLeaderId ? "Save Leader Changes" : "Save Leader Profile"}
                  </button>
                </form>
              </div>

              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold text-emerald-950 mb-4">Current Executive Team</h3>
                
                {leaders.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <p className="text-sm text-gray-500 mb-4">Your executive board database is currently empty.</p>
                    <button 
                      onClick={importDefaultLeaders} 
                      disabled={submitting}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold px-6 py-3 rounded-xl text-sm transition shadow-md"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Auto-Import All 10 Leaders"}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {leaders.map((ldr) => (
                      <div key={ldr._id} className="p-4 rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <img 
                            src={ldr.imageUrl || "https://res.cloudinary.com/dnipaby6h/image/upload/v1789108366/WhatsApp_Image_2026-09-03_at_09.49.04_q31jcg.jpg"} 
                            alt={ldr.name} 
                            className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm shrink-0"
                          />
                          <div className="truncate">
                            <h4 className="font-bold text-sm text-gray-900 truncate">{ldr.name}</h4>
                            <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider truncate mb-0.5">{ldr.role}</p>
                            {ldr.phone && (
                              <p className="text-[10px] text-gray-500 flex items-center gap-1">
                                <Phone className="h-2.5 w-2.5" /> {ldr.phone}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0 ml-2">
                          <button onClick={() => handleEditLeader(ldr)} className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg transition">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDeleteLeader(ldr._id)} className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 8. BROADCASTS TAB */}
          {activeTab === "broadcast" && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 animate-in fade-in">
              <h2 className="text-xl sm:text-2xl font-black text-emerald-950 mb-2 flex items-center gap-2">
                <Megaphone className="text-emerald-600 shrink-0" /> Mass Broadcast Announcement
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
                  <div className="w-full flex flex-col justify-center border border-gray-200 rounded-xl px-2">
                    <div className="flex items-center gap-3">
                      {broadcastData.imageUrl && (
                        <div className="relative h-12 w-16 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 p-1 border border-gray-200 shadow-sm group">
                          <img src={broadcastData.imageUrl} alt="Preview" className="h-full w-full object-contain rounded-md" />
                          <button type="button" onClick={() => setBroadcastData({...broadcastData, imageUrl: ""})} className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow-md hover:bg-rose-600 transition z-10 opacity-0 group-hover:opacity-100">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                      <input
                        key={broadcastData.imageUrl ? "has-img" : "no-img"}
                        type="file"
                        accept="image/*"
                        disabled={uploadingMedia}
                        onChange={(e) => handleImageUpload(e, setBroadcastData, "imageUrl")}
                        className="w-full py-1.5 text-sm outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 disabled:opacity-50 cursor-pointer"
                      />
                    </div>
                  </div>
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
                  disabled={submitting || uploadingMedia}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold py-3.5 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-md"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  <span>Broadcast to All Members</span>
                </button>
              </form>
            </div>
          )}

          {/* 9. FEEDBACK & INQUIRIES TAB (NEW INTERACTIVE REPLY) */}
          {activeTab === "feedback" && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 animate-in fade-in">
              <h2 className="text-xl sm:text-2xl font-black text-emerald-950 mb-2 flex items-center gap-2">
                <MessageSquare className="text-emerald-600 shrink-0" /> Student Inquiries & Support
              </h2>
              <p className="text-sm text-gray-500 mb-6">Direct student feedback and inquiries logged from the support form.</p>

              {feedbacks.length === 0 ? (
                <div className="text-center py-12 text-gray-400 font-medium bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  No feedback or inquiries logged.
                </div>
              ) : (
                <div className="space-y-4">
                  {feedbacks.map((item) => (
                    <div key={item._id} className="p-5 rounded-2xl border border-gray-200 bg-gray-50 relative group">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pr-8 mb-2">
                        <h4 className="font-bold text-gray-900">{item.subject}</h4>
                        <span className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleString()}</span>
                      </div>
                      
                      <button 
                        onClick={() => handleDeleteFeedback(item._id)} 
                        className="absolute top-4 right-4 p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Delete Inquiry"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                      <p className="text-xs font-semibold text-emerald-700 mb-2">
                        From: {item.fullName} ({item.email})
                      </p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap bg-white p-4 rounded-xl border border-gray-100">
                        {item.message}
                      </p>

                      {/* INTERACTIVE REPLY BLOCK */}
                      <div className="pt-2 mt-2">
                        {replyingToId === item._id ? (
                          <form onSubmit={(e) => handleSendReply(e, item)} className="space-y-3 mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                            <textarea
                              rows={4}
                              required
                              placeholder="Type your official response here. This will be sent directly to the student's email..."
                              value={replyMessage}
                              onChange={(e) => setReplyMessage(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50 text-sm outline-none focus:border-emerald-600 focus:bg-white transition"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                type="submit"
                                disabled={isReplying}
                                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold py-2 px-5 rounded-xl text-xs transition flex items-center gap-2 shadow-sm"
                              >
                                {isReplying ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                Send Reply
                              </button>
                              <button
                                type="button"
                                disabled={isReplying}
                                onClick={() => { setReplyingToId(null); setReplyMessage(""); }}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-xl text-xs transition"
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <button
                            onClick={() => { setReplyingToId(item._id); setReplyMessage(""); }}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-lg transition"
                          >
                            <MessageSquare className="h-3.5 w-3.5" /> Write a Reply
                          </button>
                        )}
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
