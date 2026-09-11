"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { 
  ArrowLeft, Calendar, Camera, GraduationCap, 
  BookOpen, Loader2, Award, CheckCircle, ShieldCheck,
  MessageSquare, Send, X
} from "lucide-react";

export default function PublicProfilePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Direct Messaging States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [messageText, setMessageText] = useState("");
  const [isFetchingChat, setIsFetchingChat] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Member Profile Data
  useEffect(() => {
    fetch(`/api/directory/${params.id}`)
      .then(res => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(data => {
        setProfile(data.profile);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(true);
        setLoading(false);
      });
  }, [params.id]);

  // 2. Fetch Chat History when Chat Modal is Opened
  useEffect(() => {
    const fetchChatHistory = async () => {
      if (!isChatOpen || !user || !profile) return;
      setIsFetchingChat(true);
      try {
        const res = await fetch(`/api/messages?user1=${user.id}&user2=${profile.id}`);
        if (res.ok) {
          const data = await res.json();
          setChatHistory(data.messages || []);
        }
      } catch (err) {
        console.error("Failed to load chat", err);
      } finally {
        setIsFetchingChat(false);
      }
    };
    fetchChatHistory();
  }, [isChatOpen, user, profile]);

  // 3. Auto-scroll Chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // 4. Send Message Handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !user || !profile) return;

    const tempMessage = {
      _id: Date.now().toString(),
      senderId: user.id,
      content: messageText,
      createdAt: new Date().toISOString()
    };

    setChatHistory(prev => [...prev, tempMessage]);
    const sentText = messageText;
    setMessageText("");
    setIsSending(true);

    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: user.id,
          senderName: user.fullName || "Member",
          receiverId: profile.id,
          receiverName: profile.fullName,
          content: sentText,
        }),
      });
    } catch (err) {
      console.error("Failed to send message", err);
    } finally {
      setIsSending(false);
    }
  };

  if (loading || !isLoaded) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-4 font-sans">
        <ShieldCheck className="h-12 w-12 text-gray-300" />
        <p className="text-gray-500 font-bold">User profile could not be found.</p>
        <button onClick={() => router.back()} className="text-emerald-600 font-bold hover:underline">
          Go back to directory
        </button>
      </div>
    );
  }

  const isOwnProfile = user?.id === profile.id;
  const firstName = (profile.fullName || "Member").split(" ")[0];

  return (
    <div className="p-4 sm:p-8 lg:p-12 max-w-5xl mx-auto space-y-8 font-sans">
      
      {/* Back Navigation */}
      <button 
        onClick={() => router.back()} 
        className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-emerald-700 transition"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Membership Portal
      </button>

      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Banner */}
        <div className="h-32 sm:h-44 w-full bg-emerald-950 relative">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-400 to-transparent"></div>
        </div>
        
        <div className="px-6 sm:px-10 pb-8 relative">
          {/* Avatar & Message CTA row */}
          <div className="relative -mt-16 sm:-mt-20 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div className="h-32 w-32 sm:h-40 sm:w-40 rounded-full border-4 border-white bg-gray-100 shadow-md overflow-hidden shrink-0">
              {profile.imageUrl ? (
                <img src={profile.imageUrl} alt={profile.fullName} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-4xl font-black">
                  {profile.fullName[0]}
                </div>
              )}
            </div>
            
            {/* Actions & Badges */}
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-start sm:justify-end">
              <span className={`px-4 py-2 rounded-xl text-xs font-bold border ${
                profile.status === "Registered Member" 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}>
                {profile.status}
              </span>

              {!isOwnProfile ? (
                <button
                  onClick={() => setIsChatOpen(true)}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-xl text-xs sm:text-sm shadow-sm transition"
                >
                  <MessageSquare className="h-4 w-4" /> Message {firstName}
                </button>
              ) : (
                <span className="text-xs font-bold text-gray-400 bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl">
                  (Your Public Profile)
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900">{profile.fullName}</h1>
            
            <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-gray-500 pt-2">
              <div className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-emerald-600" /> {profile.course || "General Course"}
              </div>
              <div className="flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-emerald-600" /> {profile.year || "Year 1"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Excursions & Nature Snaps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Event Excursions History */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 flex flex-col">
          <h2 className="text-xl font-black text-emerald-950 flex items-center gap-2 mb-6">
            <Calendar className="h-5 w-5 text-emerald-600" /> Event Excursions
          </h2>

          {profile.rsvps.length === 0 ? (
            <p className="text-sm text-gray-400">No events attended yet.</p>
          ) : (
            <div className="space-y-3 flex-1">
              {profile.rsvps.map((rsvp: any) => (
                <div key={rsvp._id} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className={`h-5 w-5 shrink-0 mt-0.5 ${rsvp.isUpcoming ? "text-amber-500" : "text-emerald-500"}`} />
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm leading-tight">{rsvp.eventName}</h4>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(rsvp.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${
                    rsvp.isUpcoming ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                  }`}>
                    {rsvp.attendanceStatus}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Nature Snaps Wall Submissions */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 flex flex-col">
          <h2 className="text-xl font-black text-emerald-950 flex items-center gap-2 mb-6">
            <Camera className="h-5 w-5 text-emerald-600" /> Nature Snaps Portfolio
          </h2>

          {profile.snaps.length === 0 ? (
            <p className="text-sm text-gray-400">No photos submitted to the challenge.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 flex-1">
              {profile.snaps.map((snap: any) => (
                <div key={snap._id} className="relative aspect-square rounded-2xl overflow-hidden group shadow-sm bg-gray-100 border border-gray-200">
                  <img src={snap.imageUrl} alt="Nature Snap" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex flex-col justify-end p-3">
                    <p className="text-white text-xs font-bold line-clamp-1">{snap.caption}</p>
                    <p className="text-emerald-300 text-[10px] flex items-center gap-1 mt-1 font-bold">
                      <Award className="h-3 w-3" /> {snap.likes?.length || 0} Likes
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Interactive Direct Message Modal */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col" style={{ maxHeight: '82vh' }}>
            
            {/* Modal Topbar */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                  {profile.imageUrl ? (
                    <img src={profile.imageUrl} alt={profile.fullName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm">
                      {profile.fullName[0]}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-base font-black text-emerald-950 leading-tight">{profile.fullName}</h3>
                  <p className="text-xs text-emerald-600 font-bold">{profile.status}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsChatOpen(false)} 
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Live Chat History Window */}
            <div ref={chatScrollRef} className="p-5 flex-1 overflow-y-auto bg-gray-50 space-y-3 min-h-[260px]">
              {isFetchingChat ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                </div>
              ) : chatHistory.length === 0 ? (
                <div className="text-center text-gray-400 text-sm mt-12 flex flex-col items-center">
                  <MessageSquare className="h-8 w-8 text-gray-300 mb-2" />
                  No messages yet. Say hello to {firstName}!
                </div>
              ) : (
                chatHistory.map((msg, i) => {
                  const isMine = msg.senderId === user?.id;
                  return (
                    <div key={i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                        isMine ? 'bg-emerald-600 text-white rounded-br-sm shadow-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Bar */}
            <div className="p-4 bg-white border-t border-gray-100 shrink-0">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder={`Message ${firstName}...`}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 text-sm focus:border-emerald-600 outline-none bg-gray-50 focus:bg-white transition"
                />
                <button
                  type="submit"
                  disabled={!messageText.trim() || isSending}
                  className="p-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white transition disabled:opacity-50 shrink-0"
                >
                  {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
