"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
import { EcoPopup } from "@/components/EcoSpotlight";

const NAV_SECTIONS = [
  {
    label: "Discover",
    items: [
      { href: "/dashboard", label: "Home", icon: Home },
      { href: "/dashboard/events", label: "Events & snaps", icon: CalendarDays },
      { href: "/dashboard/snaps", label: "Nature Snaps", icon: Camera },
      { href: "/dashboard/dispatch", label: "EcoPulse", icon: Radio },
    ],
  },
  {
    label: "Club",
    items: [
      { href: "/dashboard/membership", label: "Membership", icon: Users },
      { href: "/dashboard/merchandise", label: "Merchandise", icon: ShoppingBag },
      { href: "/dashboard/wck-card", label: "WCK Card", icon: CreditCard },
    ],
  },
  {
    label: "You",
    items: [
      { href: "/dashboard/account", label: "Account", icon: UserCircle },
      { href: "/dashboard/support", label: "Support", icon: HelpCircle },
    ],
  },
];

const MOBILE_NAV = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/events", label: "Events", icon: CalendarDays },
  { href: "/dashboard/snaps", label: "Snaps", icon: Camera },
  { href: "/dashboard/membership", label: "Club", icon: Users },
  { href: "/dashboard/account", label: "You", icon: UserCircle },
];

const isNavActive = (pathname: string, href: string) =>
  href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

// Laptop/desktop header shows the five primary destinations; everything else
// stays one tap away in the drawer.
const DESKTOP_NAV = [
  ...NAV_SECTIONS[0].items,
  NAV_SECTIONS[1].items[0],
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const router = useRouter(); // Hook for smart programmatic navigation
  const pathname = usePathname() || "/dashboard";
  
  // UI Dropdown State
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [messageTab, setMessageTab] = useState<"messages" | "streaks">("messages");
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
    const poll = () => {
      if (document.visibilityState === "visible") refreshInbox();
    };
    poll();
    const interval = window.setInterval(poll, 30000);
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshInbox();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
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
  const visibleDirectoryContacts = messageTab === "streaks"
    ? sortedDirectoryContacts
      .filter((contact) => (inboxByContactId[contact.clerkId]?.streakWeeks || 0) > 0)
      .sort((first, second) =>
        inboxByContactId[second.clerkId].streakWeeks - inboxByContactId[first.clerkId].streakWeeks
      )
    : sortedDirectoryContacts;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-canvas font-sans">
      
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-emerald-950/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation - Now Responsive with 100dvh for proper mobile height */}
      <aside
        aria-hidden={!isMobileMenuOpen}
        className={`fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-72 max-w-[85vw] transform flex-col bg-gradient-to-b from-[#043527] via-[#064e3b] to-[#02231a] text-white shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          isMobileMenuOpen ? "translate-x-0" : "pointer-events-none -translate-x-full"
        }`}
      >
        <div className="relative flex items-center justify-between space-x-3 overflow-hidden p-5 pb-4">
          <span className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-lime-400/15 blur-2xl" />
          <div className="relative flex items-center space-x-3">
            <img 
              src={logoUrl} 
              alt="DEKUWEC Logo" 
              className="h-10 w-10 shrink-0 rounded-full bg-white/90 p-0.5 object-cover ring-2 ring-white/20"
            />
            <div>
              <h2 className="text-lg font-black leading-none tracking-tight">DEKUWEC</h2>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Member portal</p>
            </div>
          </div>
          {/* Mobile Close Button */}
          <button onClick={() => setIsMobileMenuOpen(false)} className="rounded-full p-1.5 text-emerald-200 transition hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="mb-1.5 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-400/80">
                {section.label}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = isNavActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                        active
                          ? "bg-white/12 font-bold text-white shadow-sm"
                          : "font-medium text-emerald-100/85 hover:bg-white/8 hover:text-white"
                      }`}
                    >
                      <span
                        className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full transition ${
                          active ? "bg-lime-300" : "bg-transparent"
                        }`}
                      />
                      <item.icon
                        className={`h-4 w-4 shrink-0 transition ${
                          active ? "text-lime-300" : "text-emerald-300 group-hover:text-lime-200"
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-white/10 p-3 pb-6">
          <div className="flex items-center gap-2.5 rounded-2xl bg-white/8 p-2.5">
            {user?.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={user.fullName || "Member"}
                className="h-9 w-9 rounded-full object-cover ring-2 ring-lime-300/40"
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-800 text-xs font-black text-lime-200">
                {(user?.firstName?.[0] || "D").toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-white">
                {user?.fullName || user?.username || "DEKUWEC member"}
              </p>
              <p className="truncate text-[10px] text-emerald-300">
                {user?.primaryEmailAddress?.emailAddress || "Member portal"}
              </p>
            </div>
            <div className="shrink-0">
              <UserButton />
            </div>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-h-0 flex-1 flex-col">
        
        <header className="glass sticky top-0 z-30 border-b border-emerald-100/80">
          <div className="mx-auto flex h-16 w-full max-w-[1500px] items-center gap-2 px-3 sm:px-6">
          
          {/* Mobile drawer trigger + brand */}
          <button onClick={() => setIsMobileMenuOpen(true)} className="rounded-xl p-2 text-emerald-800 transition hover:bg-emerald-50 lg:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
            <img src={logoUrl} alt="DEKUWEC" className="h-8 w-8 rounded-full object-cover ring-2 ring-emerald-100" />
            <span className="hidden text-sm font-black tracking-tight text-emerald-950 sm:block">DEKUWEC</span>
          </Link>

          {/* Desktop navigation */}
          <nav className="ml-2 hidden items-center gap-0.5 lg:flex">
            {DESKTOP_NAV.map((item) => {
              const active = isNavActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] transition ${
                    active
                      ? "bg-emerald-50 font-bold text-emerald-900"
                      : "font-semibold text-slate-600 hover:bg-emerald-50/70 hover:text-emerald-800"
                  }`}
                >
                  <item.icon className={`h-4 w-4 ${active ? "text-emerald-700" : "text-slate-400"}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Like button */}
          <div className="ml-auto flex items-center">
            <button 
              onClick={handleLikePortal}
              disabled={hasLiked}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition md:gap-2 md:px-5 md:py-2 md:text-sm ${
                hasLiked 
                  ? 'cursor-default border-rose-200 bg-rose-50 text-rose-600' 
                  : 'border-emerald-100 bg-white/80 text-emerald-800 shadow-sm hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600'
              }`}
            >
              <Heart className={`h-3.5 w-3.5 md:h-4 md:w-4 ${hasLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
              <span className="hidden md:inline">Like our portal</span>
              <span className="md:hidden">Like</span>
              <span className="ml-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 md:ml-1 md:text-xs">
                {likeCount}
              </span>
            </button>
          </div>

          {/* Icons & profile */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            
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

            <div className="ml-1 flex items-center border-l border-emerald-100 pl-2">
              <UserButton />
            </div>
          </div>
          </div>
        </header>

        {/* LIVE Slide-out Messages Panel (Scaled for Mobile) */}
        {isMessagesOpen && (
          <div className="animate-pop fixed inset-y-0 right-0 z-[60] flex w-full flex-col border-l border-emerald-100 bg-white shadow-2xl sm:w-96">
            
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
                <div className="flex gap-2 border-b border-gray-100 bg-white p-2">
                  <button
                    onClick={() => setMessageTab("messages")}
                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition ${messageTab === "messages" ? "bg-emerald-100 text-emerald-900" : "text-gray-500 hover:bg-gray-50"}`}
                  >
                    Messages
                  </button>
                  <button
                    onClick={() => setMessageTab("streaks")}
                    className={`flex-1 inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-bold transition ${messageTab === "streaks" ? "bg-orange-100 text-orange-800" : "text-gray-500 hover:bg-gray-50"}`}
                  >
                    <Flame className="h-3.5 w-3.5" /> Streaks
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {visibleDirectoryContacts.map((contact) => {
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
                  {!isFetchingContacts && messageTab === "streaks" && directoryContacts.length > 0 && visibleDirectoryContacts.length === 0 && (
                    <div className="mt-4 flex flex-col items-center p-5 text-center text-xs text-gray-500">
                      <Flame className="mb-2 h-6 w-6 text-orange-400" />
                      No active streaks yet. Message a friend each week to build one.
                    </div>
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

        <main className="flex min-h-0 flex-1 flex-col" onClick={() => { setIsNotifOpen(false); setIsMessagesOpen(false); }}>
          <div className="mx-auto w-full max-w-[1500px] flex-1 pb-24 lg:pb-6">{children}</div>
          <footer className="mt-auto flex shrink-0 flex-col items-center justify-between gap-6 border-t border-emerald-100 bg-white px-8 py-6 md:flex-row z-10">
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

        {/* Mobile bottom navigation */}
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-emerald-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          <div className="flex items-stretch justify-around">
            {MOBILE_NAV.map((item) => {
              const active = isNavActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold transition ${
                    active ? "text-emerald-800" : "text-slate-400 hover:text-emerald-700"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                      active ? "bg-emerald-100 text-emerald-800" : "text-slate-500"
                    }`}
                  >
                    <item.icon className="h-[18px] w-[18px]" />
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
      <EcoPopup />
    </div>
  );
}