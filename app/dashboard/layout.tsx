"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
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
  Loader2
} from "lucide-react";

const CLUB_DIRECTORY = [
  { id: "admin_1", name: "DEKUWEC Official Admin", role: "Club Management", isOnline: true },
  { id: "exec_2", name: "Grace Chebet", role: "Vice Chairperson", isOnline: false },
  { id: "exec_3", name: "Elizabeth Mwelu", role: "Club Secretary", isOnline: true },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  
  // UI Dropdown State
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  
  // Live Database State
  const [notifications, setNotifications] = useState<any[]>([]);
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

  // 3. Fetch REAL Chat History when a contact is selected
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
      console.error("Failed to mark notifications as read", error);
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
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#064e3b] text-white flex flex-col h-screen sticky top-0 shrink-0">
        <div className="p-6 flex items-center space-x-3">
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

        <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto">
          <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest mb-3 px-2">Navigation Menu</p>
          <Link href="/dashboard" className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-emerald-800/60 text-sm font-medium text-emerald-100 transition">
            <Home className="h-4 w-4 text-emerald-300" /><span>Home</span>
          </Link>
          <Link href="/dashboard/events" className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-emerald-800/60 text-sm font-medium text-emerald-100 transition">
            <CalendarDays className="h-4 w-4 text-emerald-300" /><span>Events & Activities</span>
          </Link>
          <Link href="/dashboard/dispatch" className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-emerald-800/60 text-sm font-medium text-emerald-100 transition">
            <Radio className="h-4 w-4 text-emerald-300" /><span>EcoPulse Dispatch</span>
          </Link>
          <Link href="/dashboard/snaps" className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-emerald-800/60 text-sm font-medium text-emerald-100 transition">
            <Camera className="h-4 w-4 text-emerald-300" /><span>Nature Snaps</span>
          </Link>
          <Link href="/dashboard/membership" className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-emerald-800/60 text-sm font-medium text-emerald-100 transition">
            <Users className="h-4 w-4 text-emerald-300" /><span>Membership Portal</span>
          </Link>
          <Link href="/dashboard/support" className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-emerald-800/60 text-sm font-medium text-emerald-100 transition">
            <HelpCircle className="h-4 w-4 text-emerald-300" /><span>Support & Inquiries</span>
          </Link>
          <Link href="/dashboard/wck-card" className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-emerald-800/60 text-sm font-medium text-emerald-100 transition">
            <CreditCard className="h-4 w-4 text-emerald-300" /><span>WCK Card Application</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-emerald-800/60">
          <Link href="/dashboard/account" className="flex items-center space-x-3 px-4 py-3 mb-3 rounded-xl border border-emerald-500/40 bg-emerald-900/60 hover:bg-emerald-800 transition text-sm font-bold text-emerald-100">
            <UserCircle className="h-4 w-4 text-emerald-300" /><span>Account Dashboard</span>
          </Link>
          
          <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest text-center mb-2">Follow Our Community</p>
          <div className="flex justify-center gap-2">
            <a href="https://www.instagram.com/wildlifeandenvironmentalclub/" target="_blank" rel="noreferrer" className="p-1.5 bg-white rounded-lg hover:scale-110 transition shadow-sm">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="url(#igGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><defs><linearGradient id="igGrad" x1="2" y1="2" x2="22" y2="22"><stop offset="0%" stopColor="#f9ce34" /><stop offset="50%" stopColor="#ee2a7b" /><stop offset="100%" stopColor="#6228d7" /></linearGradient></defs><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </a>
            <a href="https://www.tiktok.com/@dekuwec_dekut?_r=1&_t=ZS-99Q1Zs2LjYP" target="_blank" rel="noreferrer" className="p-1.5 bg-black rounded-lg hover:scale-110 transition shadow-sm flex items-center justify-center">
              <svg className="h-4 w-4 fill-white" viewBox="0 0 448 512"><path d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z"/></svg>
            </a>
            <a href="https://www.linkedin.com/in/dekut-wildlife-and-environment-club-dekuwec-99b43a341?utm_source=share_via&utm_content=profile&utm_medium=member_android" target="_blank" rel="noreferrer" className="p-1.5 bg-[#0A66C2] rounded-lg hover:scale-110 transition shadow-sm flex items-center justify-center">
              <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
            </a>
            <a href="https://x.com/Dekut_WEC" target="_blank" rel="noreferrer" className="p-1.5 bg-black rounded-lg hover:scale-110 transition shadow-sm flex items-center justify-center">
              <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 24.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
          </div>
        </div>
      </aside>

      {/* Right Side: Top Header + Main Content Area + Footer */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0 z-20 shadow-sm relative">
          
          <div className="w-32 hidden sm:block"></div>

          {/* CENTER: The Like Button */}
          <div className="flex justify-center flex-1">
            <button 
              onClick={handleLikePortal}
              disabled={hasLiked}
              className={`flex items-center gap-2 px-5 py-2 rounded-full transition shadow-sm border font-bold text-sm ${
                hasLiked 
                  ? 'bg-rose-50 text-rose-600 border-rose-200 cursor-default' 
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'
              }`}
            >
              <Heart className={`h-4 w-4 ${hasLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
              <span>Like our portal</span>
              <span className="bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full text-xs ml-1 font-black">
                {likeCount}
              </span>
            </button>
          </div>

          {/* RIGHT SIDE: Icons & Profile */}
          <div className="flex items-center space-x-3 sm:space-x-4 w-32 justify-end">
            
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
                <div className="absolute right-0 mt-3 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h3 className="font-bold text-gray-900">Notifications</h3>
                    {unreadNotifs > 0 && (
                      <button onClick={handleMarkAllRead} className="text-xs font-semibold text-emerald-600 hover:text-emerald-800">Mark all read</button>
                    )}
                  </div>
                  <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-8">You have no new notifications.</p>
                    ) : (
                      notifications.map((notif) => (
                        <div key={notif._id} className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition cursor-pointer ${!notif.isRead ? 'bg-emerald-50/30' : ''}`}>
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

            <div className="pl-2 border-l border-gray-200 flex items-center">
              <UserButton />
            </div>
          </div>
        </header>

        {/* LIVE Slide-out Messages Panel */}
        {isMessagesOpen && (
          <div className="absolute right-0 top-16 bottom-0 w-80 sm:w-96 bg-white border-l border-gray-200 shadow-2xl z-30 flex flex-col animate-in slide-in-from-right duration-300">
            
            {!activeChat ? (
              <>
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-emerald-900 text-white">
                  <h3 className="font-bold text-lg">Direct Messages</h3>
                  <button onClick={() => setIsMessagesOpen(false)} className="p-1 hover:bg-emerald-800 rounded-full transition"><X className="h-5 w-5" /></button>
                </div>
                <div className="p-3 bg-gray-50 text-xs text-gray-500 font-semibold border-b border-gray-100 uppercase tracking-wider">
                  Club Contacts Directory
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {CLUB_DIRECTORY.map((contact) => (
                    <div 
                      key={contact.id} 
                      onClick={() => setActiveChat(contact)}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-50 cursor-pointer transition border border-transparent hover:border-emerald-100 mb-1"
                    >
                      <div className="relative shrink-0">
                        <div className="h-10 w-10 bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center rounded-full">
                          {contact.name[0]}
                        </div>
                        <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${contact.isOnline ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-gray-900 truncate">{contact.name}</h4>
                        <p className="text-xs text-emerald-600 truncate font-semibold">{contact.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col h-full bg-gray-50">
                <div className="p-4 border-b border-gray-200 bg-white flex items-center gap-3 shadow-sm z-10">
                  <button onClick={() => { setActiveChat(null); setChatHistory([]); }} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-full transition">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div className="flex items-center gap-2 flex-1">
                    <div className="relative">
                      <div className="h-8 w-8 bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center rounded-full text-xs">
                        {activeChat.name[0]}
                      </div>
                      <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${activeChat.isOnline ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 leading-tight">{activeChat.name}</h4>
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
            <div className="flex items-center gap-3">
              <a href="https://www.instagram.com/wildlifeandenvironmentalclub/" target="_blank" rel="noreferrer" className="p-2 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition shadow-sm"><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="url(#igGrad2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><defs><linearGradient id="igGrad2" x1="2" y1="2" x2="22" y2="22"><stop offset="0%" stopColor="#f9ce34" /><stop offset="50%" stopColor="#ee2a7b" /><stop offset="100%" stopColor="#6228d7" /></linearGradient></defs><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg></a>
              <a href="https://www.tiktok.com/@dekuwec_dekut?_r=1&_t=ZS-99Q1Zs2LjYP" target="_blank" rel="noreferrer" className="p-2 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition shadow-sm"><svg className="h-5 w-5 fill-black" viewBox="0 0 448 512"><path d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z"/></svg></a>
              <a href="https://www.linkedin.com/in/dekut-wildlife-and-environment-club-dekuwec-99b43a341?utm_source=share_via&utm_content=profile&utm_medium=member_android" target="_blank" rel="noreferrer" className="p-2 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition shadow-sm"><svg className="h-5 w-5 fill-[#0A66C2]" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg></a>
              <a href="https://x.com/Dekut_WEC" target="_blank" rel="noreferrer" className="p-2 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition shadow-sm"><svg className="h-5 w-5 fill-black" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 24.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>
            </div>
            <div className="text-xs text-gray-400 font-medium text-center md:text-right">&copy; 2026 DEKUWEC • Dedan Kimathi University of Technology. <br className="md:hidden" />All Rights Reserved.</div>
          </footer>
        </main>
      </div>
    </div>
  );
}
