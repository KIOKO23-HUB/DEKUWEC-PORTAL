"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { 
  Home, 
  CalendarDays, 
  Radio, 
  Camera, 
  Users, 
  HelpCircle, 
  CreditCard,
  UserCircle,
  MessageSquare,
  Bell,
  Heart,
  X,
  Send,
  ChevronLeft,
  Loader2,
  Menu,
  ShoppingBag,
  ImagePlus,
  Smile,
  Flame,
  Download,
  Eye,
  XCircle
} from "lucide-react";
import MessageAttachment from "@/components/MessageAttachment";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const router = useRouter(); // Hook for smart programmatic navigation
  
  // UI Dropdown State
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); 
  
  // Live Database State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [directoryContacts, setDirectoryContacts] = useState<any[]>([]);
  const [inboxByContactId, setInboxByContactId] = useState<Record<string, any>>({});
  const [unreadMessageTotal, setUnreadMessageTotal] = useState(0);
  const [isFetchingContacts, setIsFetchingContacts] = useState(false);
  const [activeChat, setActiveChat] = useState<any | null>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [presenceById, setPresenceById] = useState<Record<string, { isOnline: boolean; lastSeenAt: string | null }>>({});
  const [weeklyStreak, setWeeklyStreak] = useState(0);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [pendingContactId, setPendingContactId] = useState<string | null>(null);
  
  // Like Button State
  const [likeCount, setLikeCount] = useState(20);
  const [hasLiked, setHasLiked] = useState(false);
  
  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const typingDebounceRef = useRef<number | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaViewOnce, setMediaViewOnce] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [emojiMode, setEmojiMode] = useState<"emoji" | "sticker">("emoji");
  const mediaInputRef = useRef<HTMLInputElement>(null);

  // Reliable Cloudinary Logo URL
  const logoUrl = "https://res.cloudinary.com/dnipaby6h/image/upload/v1789108366/WhatsApp_Image_2026-09-03_at_09.49.04_q31jcg.jpg";

  const refreshInbox = async () => {
    if (!user) return;
    try {
      const response = await fetch("/api/messages/inbox", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      const summary: Record<string, any> = {};
      (data.conversations || []).forEach((conversation: any) => {
        summary[conversation.contactId] = conversation;
      });
      setInboxByContactId(summary);
      setUnreadMessageTotal(data.unreadTotal || 0);
    } catch (error) {
      console.error("Failed to refresh message inbox", error);
    }
  };

  // Close menus when hitting Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsNotifOpen(false);
        setIsMessagesOpen(false);
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("openMessages") === "1") {
      setIsMessagesOpen(true);
      setPendingContactId(url.searchParams.get("contact"));
      url.searchParams.delete("openMessages");
      url.searchParams.delete("contact");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }, []);

  // 1. Fetch Global Likes on Load
  useEffect(() => {
    if (localStorage.getItem("dekuwec_portal_liked")) {
      setHasLiked(true);
    }
    
    fetch("/api/likes")
      .then(res => res.json())
      .then(data => {
        if (data.likes) setLikeCount(data.likes);
      })
      .catch(err => console.error("Failed to load likes", err));
  }, []);

  // 2. Fetch REAL Notifications from MongoDB
  useEffect(() => {
    if (user) {
      fetch(`/api/notifications?clerkId=${user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.notifications) setNotifications(data.notifications);
        })
        .catch(err => console.error("Failed to load notifications", err));
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const heartbeat = () => {
      if (document.visibilityState === "visible") {
        fetch("/api/messages/presence", { method: "POST" }).catch(() => {});
      }
    };
    heartbeat();
    const interval = window.setInterval(heartbeat, 45000);
    document.addEventListener("visibilitychange", heartbeat);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", heartbeat);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    refreshInbox();
    const interval = window.setInterval(refreshInbox, 5000);
    return () => window.clearInterval(interval);
  }, [user?.id]);

  // 3. Fetch REAL Contacts Directory when Message Sidebar is opened
  useEffect(() => {
    if (isMessagesOpen && directoryContacts.length === 0) {
      setIsFetchingContacts(true);
      fetch("/api/directory")
        .then(res => res.json())
        .then(data => setDirectoryContacts(data))
        .catch(err => console.error("Failed to load contacts", err))
        .finally(() => setIsFetchingContacts(false));
    }
  }, [isMessagesOpen, directoryContacts.length]);

  useEffect(() => {
    if (!isMessagesOpen || !pendingContactId || directoryContacts.length === 0) return;
    const contact = directoryContacts.find((entry) => entry.clerkId === pendingContactId);
    if (!contact) {
      setPendingContactId(null);
      return;
    }
    setActiveChat({
      id: contact.clerkId,
      name: contact.fullName || "Member",
      role: contact.status || "Pending",
      isOnline: presenceById[contact.clerkId]?.isOnline || false,
      lastSeenAt: presenceById[contact.clerkId]?.lastSeenAt || null,
    });
    setPendingContactId(null);
  }, [isMessagesOpen, pendingContactId, directoryContacts, presenceById]);

  useEffect(() => {
    if (!isMessagesOpen || directoryContacts.length === 0) return;
    const refreshPresence = async () => {
      try {
        const ids = directoryContacts.map((contact) => contact.clerkId).filter(Boolean);
        if (ids.length === 0) return;
        const res = await fetch("/api/messages/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIds: ids }),
        });
        if (!res.ok) return;
        const data = await res.json();
        const nextPresence: typeof presenceById = {};
        (data.presence || []).forEach((entry: any) => {
          nextPresence[entry.clerkId] = { isOnline: entry.isOnline, lastSeenAt: entry.lastSeenAt };
        });
        setPresenceById(nextPresence);
      } catch (error) {
        console.error("Failed to refresh message presence", error);
      }
    };
    refreshPresence();
    const interval = window.setInterval(refreshPresence, 30000);
    return () => window.clearInterval(interval);
  }, [isMessagesOpen, directoryContacts]);

  // Poll the open conversation so incoming messages and read state stay current.
  useEffect(() => {
    if (!user || !activeChat) return;
    let isFirstLoad = true;
    let lastMessageId: string | null = null;
    let lastMessageAt: string | null = null;
    const loadChat = async () => {
      try {
        const after = lastMessageId && lastMessageAt ? `&after=${lastMessageId}&afterAt=${encodeURIComponent(lastMessageAt)}` : "";
        const res = await fetch(`/api/messages?user1=${user.id}&user2=${activeChat.id}${after}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Could not load messages");
        const data = await res.json();
        if (data.messages) {
          if (isFirstLoad) {
            setChatHistory(data.messages);
          } else if (data.messages.length) {
            setChatHistory((previous) => {
              const knownIds = new Set(previous.map((message) => message._id));
              return [...previous, ...data.messages.filter((message: any) => !knownIds.has(message._id))];
            });
          }
          if (data.messages.length) {
            const latest = data.messages[data.messages.length - 1];
            lastMessageId = latest._id;
            lastMessageAt = latest.createdAt;
          }
        }
        setWeeklyStreak(data.streakWeeks || 0);
        setIsPeerTyping(Boolean(data.isPeerTyping));
        if (isFirstLoad) refreshInbox();
      } catch (error) {
        console.error("Failed to load chat", error);
      } finally {
        if (isFirstLoad) setIsLoadingChat(false);
        isFirstLoad = false;
      }
    };
    setIsLoadingChat(true);
    loadChat();
    const interval = window.setInterval(loadChat, 5000);
    return () => window.clearInterval(interval);
  }, [user, activeChat]);

  useEffect(() => {
    if (!user || !activeChat) {
      setIsPeerTyping(false);
      return;
    }
    const checkTyping = async () => {
      try {
        const response = await fetch(`/api/messages/presence?typingWith=${encodeURIComponent(activeChat.id)}`, { cache: "no-store" });
        if (response.ok) {
          const data = await response.json();
          setIsPeerTyping(Boolean(data.isTyping));
        }
      } catch {
        setIsPeerTyping(false);
      }
    };
    checkTyping();
    const interval = window.setInterval(checkTyping, 2000);
    return () => window.clearInterval(interval);
  }, [user?.id, activeChat?.id]);

  // Mark a single notification as read and route the user
  const handleNotificationClick = async (notif: any) => {
    setIsNotifOpen(false); // Close dropdown immediately

    // Mark as read locally and in the DB if it is unread
    if (!notif.isRead) {
      setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
      try {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationId: notif._id }) // Tell backend to mark specific notification
        });
      } catch (error) {
        console.error("Failed to mark as read", error);
      }
    }

    // Smart Routing Logic based on notification content
    let destination = "/dashboard"; 
    const titleLower = (notif.title || "").toLowerCase();
    
    if (notif.link) {
      destination = notif.link; // Explicit link provided by admin
    } else if (notif.type === "support" || titleLower.includes("support") || titleLower.includes("inquiry")) {
      destination = "/dashboard/support";
    } else if (titleLower.includes("event") || titleLower.includes("hike") || titleLower.includes("excursion")) {
      destination = "/dashboard/events";
    } else if (titleLower.includes("ecopulse") || titleLower.includes("article") || titleLower.includes("quiz")) {
      destination = "/dashboard/dispatch";
    } else if (titleLower.includes("snap") || titleLower.includes("photo")) {
      destination = "/dashboard/snaps";
    } else if (titleLower.includes("merch") || titleLower.includes("t-shirt") || titleLower.includes("hoodie") || titleLower.includes("order")) {
      destination = "/dashboard/merchandise";
    }

    // Redirect the user
    router.push(destination);
  };

  // Handle Mark All Read in Database
  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clerkId: user.id })
      });
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error("Failed to mark all notifications as read", error);
    }
  };

  const sendChatMessage = async (content: string, file: File | null, viewOnce: boolean, sticker = false) => {
    if (!user || !activeChat || (!content.trim() && !file)) return;
    setIsSending(true);
    if (typingDebounceRef.current) window.clearTimeout(typingDebounceRef.current);
    fetch("/api/messages/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ typingTo: null }),
    }).catch(() => {});
    let uploadedMedia: { url: string; type: string } | null = null;
    try {
      if (file) {
        setIsUploadingMedia(true);
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.results?.[0]) throw new Error(uploadData.error || "Upload failed");
        uploadedMedia = {
          url: uploadData.results[0].url,
          type: uploadData.results[0].resource_type === "video" ? "video" : "image",
        };
      }

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: activeChat.id,
          content: content.trim(),
          mediaUrl: uploadedMedia?.url || "",
          mediaType: uploadedMedia?.type || "",
          viewOnce: Boolean(uploadedMedia && viewOnce),
          sticker,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Message failed to send");
      if (data.data) setChatHistory((previous) => [...previous, data.data]);
      if (data.systemMessage) setChatHistory((previous) => [...previous, data.systemMessage]);
      setWeeklyStreak(data.streakWeeks || weeklyStreak);
      setChatInput("");
      setMediaFile(null);
      setMediaViewOnce(false);
      setIsEmojiPickerOpen(false);
    } catch (error) {
      console.error("Failed to send message", error);
      alert(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setIsSending(false);
      setIsUploadingMedia(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendChatMessage(chatInput, mediaFile, mediaViewOnce);
  };

  const handleChatInputChange = (value: string) => {
    setChatInput(value);
    if (!activeChat || !user) return;
    if (typingDebounceRef.current) window.clearTimeout(typingDebounceRef.current);
    if (!value.trim()) {
      fetch("/api/messages/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typingTo: null }),
      }).catch(() => {});
      return;
    }
    typingDebounceRef.current = window.setTimeout(() => {
      fetch("/api/messages/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typingTo: activeChat.id }),
      }).catch(() => {});
    }, 300);
  };

  const handleMediaSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) return alert("Choose a photo or video.");
    if (file.size > 25 * 1024 * 1024) return alert("Media must be 25 MB or smaller.");
    setMediaFile(file);
  };

  const formatLastSeen = (lastSeenAt?: string | null) => {
    if (!lastSeenAt) return "Last seen unavailable";
    const minutes = Math.floor((Date.now() - new Date(lastSeenAt).getTime()) / 60000);
    if (minutes < 1) return "Last seen just now";
    if (minutes < 60) return `Last seen ${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Last seen ${hours}h ago`;
    return `Last seen ${new Date(lastSeenAt).toLocaleDateString()}`;
  };

  // Handle Clicking the Like Button
  const handleLikePortal = async () => {
    if (hasLiked) return;
    
    setLikeCount(prev => prev + 1);
    setHasLiked(true);
    localStorage.setItem("dekuwec_portal_liked", "true");

    try {
      const res = await fetch("/api/likes", { method: "POST" });
      const data = await res.json();
      if (data.likes) setLikeCount(data.likes);
    } catch (error) {
      console.error("Failed to like portal", error);
    }
  };

  const unreadNotifs = notifications.filter(n => !n.isRead).length;
  const sortedDirectoryContacts = [...directoryContacts].sort((first, second) => {
    const firstConversation = inboxByContactId[first.clerkId];
    const secondConversation = inboxByContactId[second.clerkId];
    const firstCount = firstConversation?.totalMessages || 0;
    const secondCount = secondConversation?.totalMessages || 0;
    if (firstCount !== secondCount) return secondCount - firstCount;
    const firstTime = firstConversation?.lastMessageAt ? new Date(firstConversation.lastMessageAt).getTime() : 0;
    const secondTime = secondConversation?.lastMessageAt ? new Date(secondConversation.lastMessageAt).getTime() : 0;
    if (firstTime !== secondTime) return secondTime - firstTime;
    return (first.fullName || "").localeCompare(second.fullName || "");
  });

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans overflow-hidden">
      
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation - Now Responsive with 100dvh for proper mobile height */}
      <aside className={`fixed md:relative inset-y-0 left-0 z-50 w-64 bg-[#064e3b] text-white flex flex-col h-[100dvh] transform transition-transform duration-300 ease-in-out md:translate-x-0 ${isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}>
        <div className="p-6 flex items-center justify-between space-x-3 shrink-0">
          <div className="flex items-center space-x-3">
            <img 
              src={logoUrl} 
              alt="DEKUWEC Logo" 
              className="w-10 h-10 rounded-full bg-white p-0.5 object-cover shrink-0"
            />
            <div>
              <h2 className="font-black text-lg tracking-tight leading-none">DEKUWEC</h2>
              <p className="text-[10px] text-emerald-200 mt-1">Dedan Kimathi University</p>
            </div>
          </div>
          {/* Mobile Close Button */}
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-emerald-200 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto">
          <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest mb-3 px-2">Navigation Menu</p>
          <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-emerald-800/60 text-sm font-medium text-emerald-100 transition">
            <Home className="h-4 w-4 text-emerald-300" /><span>Home</span>
          </Link>
          <Link href="/dashboard/events" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-emerald-800/60 text-sm font-medium text-emerald-100 transition">
            <CalendarDays className="h-4 w-4 text-emerald-300" /><span>Events & Activities</span>
          </Link>
          <Link href="/dashboard/dispatch" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-emerald-800/60 text-sm font-medium text-emerald-100 transition">
            <Radio className="h-4 w-4 text-emerald-300" /><span>EcoPulse Dispatch</span>
          </Link>
          <Link href="/dashboard/snaps" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-emerald-800/60 text-sm font-medium text-emerald-100 transition">
            <Camera className="h-4 w-4 text-emerald-300" /><span>Nature Snaps</span>
          </Link>
          <Link href="/dashboard/membership" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-emerald-800/60 text-sm font-medium text-emerald-100 transition">
            <Users className="h-4 w-4 text-emerald-300" /><span>Membership Portal</span>
          </Link>
          <Link href="/dashboard/merchandise" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-emerald-800/60 text-sm font-medium text-emerald-100 transition">
            <ShoppingBag className="h-4 w-4 text-emerald-300" /><span>Club Merchandise</span>
          </Link>
          <Link href="/dashboard/support" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-emerald-800/60 text-sm font-medium text-emerald-100 transition">
            <HelpCircle className="h-4 w-4 text-emerald-300" /><span>Support & Inquiries</span>
          </Link>
          <Link href="/dashboard/wck-card" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-emerald-800/60 text-sm font-medium text-emerald-100 transition">
            <CreditCard className="h-4 w-4 text-emerald-300" /><span>WCK Card Application</span>
          </Link>
        </nav>

        {/* Added pb-8 on mobile to ensure the button clears iOS toolbars */}
        <div className="p-4 border-t border-emerald-800/60 shrink-0 pb-8 md:pb-4 bg-[#064e3b]">
          <Link href="/dashboard/account" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center space-x-3 px-4 py-3 mb-3 rounded-xl border border-emerald-500/40 bg-emerald-900/60 hover:bg-emerald-800 transition text-sm font-bold text-emerald-100">
            <UserCircle className="h-4 w-4 text-emerald-300" /><span>Account Dashboard</span>
          </Link>
        </div>
      </aside>

      {/* Right Side: Main Content Area */}
      <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden relative w-full">
        
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-8 shrink-0 z-20 shadow-sm relative">
          
          {/* Hamburger Button for Mobile */}
          <div className="flex items-center w-auto md:w-32">
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 -ml-2 text-gray-600 hover:text-emerald-700">
              <Menu className="h-6 w-6" />
            </button>
          </div>

          {/* CENTER: The Like Button (Scaled for Mobile) */}
          <div className="flex justify-center flex-1">
            <button 
              onClick={handleLikePortal}
              disabled={hasLiked}
              className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-1.5 md:py-2 rounded-full transition shadow-sm border font-bold text-xs md:text-sm ${
                hasLiked 
                  ? 'bg-rose-50 text-rose-600 border-rose-200 cursor-default' 
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'
              }`}
            >
              <Heart className={`h-3.5 w-3.5 md:h-4 md:w-4 ${hasLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
              <span className="hidden md:inline">Like our portal</span>
              <span className="md:hidden">Like</span>
              <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-[10px] md:text-xs ml-0.5 md:ml-1 font-black">
                {likeCount}
              </span>
            </button>
          </div>

          {/* RIGHT SIDE: Icons & Profile */}
          <div className="flex items-center space-x-2 md:space-x-4 w-auto md:w-32 justify-end">
            
            <button 
              onClick={() => { setIsMessagesOpen(!isMessagesOpen); setIsNotifOpen(false); }}
              aria-label={unreadMessageTotal ? `Messages, ${unreadMessageTotal} unread` : "Messages"}
              className={`relative p-2 rounded-full transition ${isMessagesOpen ? 'bg-emerald-100 text-emerald-800' : 'text-gray-500 hover:text-emerald-700 hover:bg-emerald-50'}`}
            >
              <MessageSquare className="h-5 w-5" />
              {unreadMessageTotal > 0 && (
                <span className="absolute -right-1 -top-1 min-w-5 h-5 px-1 rounded-full border-2 border-white bg-rose-600 text-white text-[10px] font-black flex items-center justify-center leading-none">
                  {unreadMessageTotal > 99 ? "99+" : unreadMessageTotal}
                </span>
              )}
            </button>

            <div className="relative">
              <button 
                onClick={() => { setIsNotifOpen(!isNotifOpen); setIsMessagesOpen(false); }}
                className={`relative p-2 rounded-full transition ${isNotifOpen ? 'bg-emerald-100 text-emerald-800' : 'text-gray-500 hover:text-emerald-700 hover:bg-emerald-50'}`}
              >
                <Bell className="h-5 w-5" />
                {unreadNotifs > 0 && (
                  <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-rose-500 border-2 border-white rounded-full"></span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 sm:-right-4 mt-3 w-[280px] sm:w-80 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden z-50">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
                    {unreadNotifs > 0 && (
                      <button onClick={handleMarkAllRead} className="text-xs font-semibold text-emerald-600 hover:text-emerald-800">Mark all read</button>
                    )}
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-8">You have no new notifications.</p>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                          key={notif._id} 
                          onClick={() => handleNotificationClick(notif)}
                          className={`p-4 border-b border-gray-50 hover:bg-emerald-50 transition cursor-pointer ${!notif.isRead ? 'bg-emerald-50/30' : ''}`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <h4 className={`text-sm ${!notif.isRead ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>{notif.title}</h4>
                            {!notif.isRead && <span className="h-2 w-2 bg-emerald-500 rounded-full mt-1.5 shrink-0"></span>}
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-2 mb-1">{notif.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="pl-1 md:pl-2 border-l border-gray-200 flex items-center">
              <UserButton />
            </div>
          </div>
        </header>

        {/* LIVE Slide-out Messages Panel (Scaled for Mobile) */}
        {isMessagesOpen && (
          <div className="absolute right-0 top-16 bottom-0 w-full sm:w-80 md:w-96 bg-white border-l border-gray-200 shadow-2xl z-30 flex flex-col animate-in slide-in-from-right duration-300">
            
            {!activeChat ? (
              <>
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-emerald-900 text-white">
                  <h3 className="font-bold text-lg">Direct Messages</h3>
                  <button onClick={() => setIsMessagesOpen(false)} className="p-1 hover:bg-emerald-800 rounded-full transition"><X className="h-5 w-5" /></button>
                </div>
                <div className="p-3 bg-gray-50 text-xs text-gray-500 font-semibold border-b border-gray-100 uppercase tracking-wider flex justify-between items-center">
                  <span>Club Contacts Directory</span>
                  {isFetchingContacts && <Loader2 className="h-3 w-3 animate-spin text-emerald-500" />}
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {sortedDirectoryContacts.map((contact) => {
                    const conversation = inboxByContactId[contact.clerkId];
                    return (
                    <div 
                      key={contact.clerkId} 
                      onClick={() => setActiveChat({
                        id: contact.clerkId,
                        name: contact.fullName || "Member",
                        role: contact.status || "Pending",
                        isOnline: presenceById[contact.clerkId]?.isOnline || false,
                        lastSeenAt: presenceById[contact.clerkId]?.lastSeenAt || null,
                      })}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-50 cursor-pointer transition border border-transparent hover:border-emerald-100 mb-1"
                    >
                      <div className="relative shrink-0">
                        {contact.imageUrl ? (
                          <img src={contact.imageUrl} alt="Profile" loading="lazy" className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          <div className="h-10 w-10 bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center rounded-full">
                            {(contact.fullName || "U")[0]}
                          </div>
                        )}
                        <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${presenceById[contact.clerkId]?.isOnline ? "bg-emerald-500" : "bg-gray-400"}`}></span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-bold text-gray-900 truncate">{contact.fullName}</h4>
                          {conversation?.unreadCount > 0 && (
                            <span className="min-w-5 h-5 px-1 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center">
                              {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {presenceById[contact.clerkId]?.isOnline ? "Online now" : formatLastSeen(presenceById[contact.clerkId]?.lastSeenAt)}
                        </p>
                        {conversation && <p className="text-[11px] text-gray-400 truncate">{conversation.lastMediaType ? `Photo/video · ${conversation.totalMessages} messages` : conversation.lastMessage || `${conversation.totalMessages} messages`}</p>}
                        {inboxByContactId[contact.clerkId]?.streakWeeks > 0 && (
                          <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-orange-600">
                            <Flame className="h-3 w-3" /> {inboxByContactId[contact.clerkId].streakWeeks} week streak
                          </span>
                        )}
                      </div>
                    </div>
                    );
                  })}
                  {!isFetchingContacts && directoryContacts.length === 0 && (
                    <div className="p-4 text-center text-xs text-gray-400 mt-4">No members found.</div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col h-full bg-gray-50">
                <div className="p-4 border-b border-gray-200 bg-white flex items-center gap-3 shadow-sm z-10">
                  <button onClick={() => { setActiveChat(null); setChatHistory([]); }} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-full transition">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="h-8 w-8 bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center rounded-full text-xs shrink-0">
                      {activeChat.name[0]}
                    </div>
                    <div className="truncate">
                      <h4 className="text-sm font-bold text-gray-900 truncate">{activeChat.name}</h4>
                      <p className="text-[10px] text-gray-500">
                        {isPeerTyping ? <span className="font-semibold text-emerald-700">Typing...</span> : presenceById[activeChat.id]?.isOnline ? "Online now" : formatLastSeen(presenceById[activeChat.id]?.lastSeenAt || activeChat.lastSeenAt)}
                        {weeklyStreak > 0 && <span className="ml-2 inline-flex items-center gap-0.5 font-bold text-orange-600"><Flame className="h-3 w-3" /> {weeklyStreak} week{weeklyStreak === 1 ? "" : "s"}</span>}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                  {isLoadingChat ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
                    </div>
                  ) : chatHistory.length === 0 ? (
                    <div className="text-center text-sm text-gray-400 mt-10 flex flex-col items-center">
                      <MessageSquare className="h-8 w-8 text-gray-300 mb-2" />
                      No messages yet. Send a message to start the conversation!
                    </div>
                  ) : (
                    chatHistory.map((msg, idx) => {
                      const isMe = msg.senderId === user?.id;
                      return (
                        <div key={msg._id || idx} className={`flex items-end gap-2 ${isMe ? 'justify-end' : ''}`}>
                          {!isMe && (
                            <div className="h-6 w-6 bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center rounded-full text-[10px] shrink-0">
                              {activeChat.name[0]}
                            </div>
                          )}
                          <div className={`p-3 rounded-2xl text-sm max-w-[80%] shadow-sm ${msg.messageType === "system" ? "bg-orange-50 border border-orange-200 text-orange-900 text-xs" : isMe ? 'bg-emerald-600 text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'}`}>
                            {msg.messageType === "sticker" ? <span className="text-5xl leading-none" role="img" aria-label="Sticker">{msg.content}</span> : msg.content}
                            <MessageAttachment message={msg} isMine={isMe} />
                            <time className={`mt-1 block text-[9px] ${isMe ? "text-white/65" : "text-gray-400"}`} dateTime={msg.createdAt}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </time>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {mediaFile && (
                  <div className="flex items-center justify-between gap-2 border-t border-gray-100 bg-emerald-50 px-3 py-2 text-xs">
                    <span className="min-w-0 truncate font-semibold text-emerald-900">{mediaFile.name}</span>
                    <div className="flex shrink-0 items-center gap-2">
                      <label className="flex items-center gap-1 font-medium text-gray-700">
                        <input type="checkbox" checked={mediaViewOnce} onChange={(event) => setMediaViewOnce(event.target.checked)} /> View once
                      </label>
                      <button type="button" onClick={() => setMediaFile(null)} aria-label="Remove attachment" className="p-1 text-gray-500 hover:text-rose-600"><X className="h-4 w-4" /></button>
                    </div>
                  </div>
                )}
                {isEmojiPickerOpen && (
                  <div className="border-t border-gray-100 bg-white p-3">
                    <div className="mb-2 flex gap-2 text-xs font-bold">
                      <button type="button" onClick={() => setEmojiMode("emoji")} className={`rounded px-2 py-1 ${emojiMode === "emoji" ? "bg-emerald-100 text-emerald-900" : "text-gray-500"}`}>Emoji</button>
                      <button type="button" onClick={() => setEmojiMode("sticker")} className={`rounded px-2 py-1 ${emojiMode === "sticker" ? "bg-emerald-100 text-emerald-900" : "text-gray-500"}`}>Stickers</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(emojiMode === "emoji" ? ["😀", "😂", "🥰", "👍", "🙏", "🌿", "🌍", "🦋", "🐘", "🔥"] : ["🌱", "🐘", "🦋", "🌍", "🌳", "💚"]).map((emoji) => (
                        <button key={emoji} type="button" aria-label={emojiMode === "sticker" ? `Send ${emoji} sticker` : `Insert ${emoji}`} onClick={() => emojiMode === "sticker" ? sendChatMessage(emoji, null, false, true) : setChatInput((value) => `${value}${emoji}`)} className={`${emojiMode === "sticker" ? "text-3xl" : "text-xl"} rounded-lg p-1 hover:bg-emerald-50`}>
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-200 flex items-center gap-2">
                  <input ref={mediaInputRef} type="file" accept="image/*,video/*" onChange={handleMediaSelection} className="hidden" />
                  <button type="button" onClick={() => mediaInputRef.current?.click()} disabled={isSending} aria-label="Attach photo or video" title="Attach photo or video" className="p-2 text-gray-500 hover:bg-emerald-50 hover:text-emerald-700 rounded-full disabled:opacity-50">
                    <ImagePlus className="h-5 w-5" />
                  </button>
                  <button type="button" onClick={() => setIsEmojiPickerOpen((open) => !open)} aria-label="Emoji and stickers" title="Emoji and stickers" className="p-2 text-gray-500 hover:bg-emerald-50 hover:text-emerald-700 rounded-full">
                    <Smile className="h-5 w-5" />
                  </button>
                  <input 
                    type="text" 
                    placeholder="Type a message..." 
                    className="flex-1 bg-gray-100 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-0 text-sm rounded-full px-4 py-2 outline-none transition"
                    value={chatInput}
                    onChange={(e) => handleChatInputChange(e.target.value)}
                    disabled={isSending || isUploadingMedia}
                  />
                  <button 
                    type="submit" 
                    disabled={isSending || isUploadingMedia || (!chatInput.trim() && !mediaFile)}
                    className="p-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-full transition shrink-0"
                  >
                    {isSending || isUploadingMedia ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        <main className="flex-1 overflow-y-auto flex flex-col bg-gray-50" onClick={() => { setIsNotifOpen(false); setIsMessagesOpen(false); }}>
          <div className="flex-1">{children}</div>
          <footer className="bg-white border-t border-gray-200 py-6 px-8 mt-auto shrink-0 flex flex-col md:flex-row items-center justify-between gap-6 z-10 shadow-sm">
            <div className="flex items-center gap-4">
              <img 
                src={logoUrl} 
                alt="DEKUWEC Logo" 
                className="w-9 h-9 rounded-full bg-white object-cover shadow-sm border border-gray-100"
              />
              <span className="text-sm font-bold text-emerald-950 leading-tight">
                Dedan Kimathi Wildlife &<br />Environmental Club
              </span>
            </div>
            <div className="text-xs text-gray-400 font-medium text-center md:text-right">&copy; 2026 DEKUWEC • Dedan Kimathi University of Technology. <br className="md:hidden" />All Rights Reserved.</div>
          </footer>
        </main>
      </div>
    </div>
  );
}