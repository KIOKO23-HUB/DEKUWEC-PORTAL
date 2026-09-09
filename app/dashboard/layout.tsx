"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
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
  Menu 
} from "lucide-react";

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
  const [isFetchingContacts, setIsFetchingContacts] = useState(false);
  const [activeChat, setActiveChat] = useState<any | null>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  
  // Like Button State
  const [likeCount, setLikeCount] = useState(20);
  const [hasLiked, setHasLiked] = useState(false);
  
  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingChat, setIsLoadingChat] = useState(false);

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

  // 4. Fetch REAL Chat History when a contact is selected
  useEffect(() => {
    if (user && activeChat) {
      setIsLoadingChat(true);
      fetch(`/api/messages?user1=${user.id}&user2=${activeChat.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.messages) setChatHistory(data.messages);
        })
        .catch(err => console.error("Failed to load chat", err))
        .finally(() => setIsLoadingChat(false));
    }
  }, [user, activeChat]);

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

  // Handle Sending a REAL Message to Database
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !user || !activeChat) return;

    setIsSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: user.id,
          senderName: user.fullName || "DEKUWEC Member",
          receiverId: activeChat.id,
          receiverName: activeChat.name,
          content: chatInput,
        }),
      });

      if (res.ok) {
        const { data: newMessage } = await res.json();
        setChatHistory((prev) => [...prev, newMessage]);
        setChatInput("");
      }
    } catch (error) {
      console.error("Failed to send message", error);
    } finally {
      setIsSending(false);
    }
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

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans overflow-hidden">
      
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation - Now Responsive */}
      <aside className={`fixed md:relative inset-y-0 left-0 z-50 w-64 bg-[#064e3b] text-white flex flex-col h-screen transform transition-transform duration-300 ease-in-out md:translate-x-0 ${isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}>
        <div className="p-6 flex items-center justify-between space-x-3">
          <div className="flex items-center space-x-3">
            <Image 
              src="https://i.postimg.cc/qB9gLwmz/Whats-App-Image-2026-09-03-at-09-49-04.jpg" 
              alt="DEKUWEC Logo" 
              width={40} 
              height={40} 
              className="rounded-full bg-white p-0.5 object-cover"
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
          <Link href="/dashboard/support" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-emerald-800/60 text-sm font-medium text-emerald-100 transition">
            <HelpCircle className="h-4 w-4 text-emerald-300" /><span>Support & Inquiries</span>
          </Link>
          <Link href="/dashboard/wck-card" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-emerald-800/60 text-sm font-medium text-emerald-100 transition">
            <CreditCard className="h-4 w-4 text-emerald-300" /><span>WCK Card Application</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-emerald-800/60">
          <Link href="/dashboard/account" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center space-x-3 px-4 py-3 mb-3 rounded-xl border border-emerald-500/40 bg-emerald-900/60 hover:bg-emerald-800 transition text-sm font-bold text-emerald-100">
            <UserCircle className="h-4 w-4 text-emerald-300" /><span>Account Dashboard</span>
          </Link>
        </div>
      </aside>

      {/* Right Side: Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative w-full">
        
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
              className={`relative p-2 rounded-full transition ${isMessagesOpen ? 'bg-emerald-100 text-emerald-800' : 'text-gray-500 hover:text-emerald-700 hover:bg-emerald-50'}`}
            >
              <MessageSquare className="h-5 w-5" />
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
                  {directoryContacts.map((contact) => (
                    <div 
                      key={contact.clerkId} 
                      onClick={() => setActiveChat({
                        id: contact.clerkId,
                        name: contact.fullName || "Member",
                        role: contact.status || "Pending",
                        isOnline: true // Defaults active indicator for UI polish
                      })}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-50 cursor-pointer transition border border-transparent hover:border-emerald-100 mb-1"
                    >
                      <div className="relative shrink-0">
                        <div className="h-10 w-10 bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center rounded-full">
                          {(contact.fullName || "U")[0]}
                        </div>
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500"></span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-gray-900 truncate">{contact.fullName}</h4>
                        <p className="text-xs text-emerald-600 truncate font-semibold">{contact.status || "Pending"}</p>
                      </div>
                    </div>
                  ))}
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
                      <p className="text-[10px] text-gray-500">{activeChat.isOnline ? 'Active now' : 'Offline'}</p>
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
                          <div className={`p-3 rounded-2xl text-sm max-w-[80%] shadow-sm ${isMe ? 'bg-emerald-600 text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'}`}>
                            {msg.content}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-200 flex items-center gap-2">
                  <input 
                    type="text" 
                    placeholder="Type a message..." 
                    className="flex-1 bg-gray-100 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-0 text-sm rounded-full px-4 py-2 outline-none transition"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={isSending}
                  />
                  <button 
                    type="submit" 
                    disabled={isSending || !chatInput.trim()}
                    className="p-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-full transition shrink-0"
                  >
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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
              <Image 
                src="https://i.postimg.cc/qB9gLwmz/Whats-App-Image-2026-09-03-at-09-49-04.jpg" 
                alt="DEKUWEC Logo" 
                width={36} 
                height={36} 
                className="rounded-full bg-white object-cover shadow-sm border border-gray-100"
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
