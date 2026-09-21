"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { 
  Calendar, 
  MapPin, 
  Clock, 
  ExternalLink, 
  Leaf, 
  Users, 
  Image as ImageIcon,
  X,
  CheckCircle,
  Send,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  CreditCard,
  AlertCircle,
  Heart,
  MessageSquare
} from "lucide-react";

// Initial fallbacks so the UI remains complete while loading or if DB is empty
const FALLBACK_UPCOMING = [
  {
    _id: "default_up_1",
    title: "Aberdare Forest Excursion & Tree Planting",
    date: "Saturday, Oct 10, 2026",
    time: "6:30 AM",
    location: "Main Gate, DeKUT",
    description: "Join our student expedition to restore native highland biodiversity. We will be planting indigenous seedlings and exploring the Karuru and Magura waterfalls trails.",
    imageUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=1000&auto=format&fit=crop",
    status: "Registration Open",
    category: "upcoming",
    isFree: false,
    likes: [],
    comments: []
  },
];

const FALLBACK_PREVIOUS = [
  {
    _id: "default_prev_1",
    title: "Baraka Children's Home Outreach",
    date: "January 2026",
    description: "Our community give-back initiative where DEKUWEC members donated clothes, foodstuff, and spent the day interacting with the kids.",
    imageUrl: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1000&auto=format&fit=crop",
    galleryLink: "https://photos.google.com",
    category: "previous",
    likes: [],
    comments: []
  },
  {
    _id: "default_prev_2",
    title: "Club Fun Day at Farm House",
    date: "June 27, 2026",
    description: "A fantastic day of outdoor activities, board games, colorfest, and team-building in partnership with AYLF.",
    imageUrl: "https://images.unsplash.com/photo-1526976663112-0058b76c8cb9?q=80&w=1000&auto=format&fit=crop",
    galleryLink: "https://photos.google.com",
    category: "previous",
    likes: [],
    comments: []
  }
];

const FALLBACK_PROJECTS = [
  {
    _id: "default_proj_1",
    title: "Campus Tree Nursery Establishment",
    description: "A continuous club initiative to cultivate indigenous tree seedlings for future conservation drives and community distribution.",
    imageUrl: "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?q=80&w=1000&auto=format&fit=crop",
    category: "project",
    likes: [],
    comments: []
  }
];

const otherEvents = [
  "Weekly Wednesday Physical Gatherings (5:00 PM – 6:45 PM)",
  "EcoPulse Wildlife Debates",
  "Monthly Campus Clean-up Drives"
];

// --- Smart Multi-Media Carousel Component ---
const EventMediaCarousel = ({ event, fallbackImage }: { event: any, fallbackImage: string }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const allMedia: any[] = [];
  if (event.imageUrl) {
    allMedia.push({ url: event.imageUrl, type: 'image' });
  }
  if (event.media && Array.isArray(event.media)) {
    allMedia.push(...event.media);
  }

  const handleNext = () => setCurrentIndex(prev => prev === allMedia.length - 1 ? 0 : prev + 1);
  const handlePrev = () => setCurrentIndex(prev => prev === 0 ? allMedia.length - 1 : prev - 1);

  useEffect(() => {
    if (allMedia.length <= 1) return;
    const currentMedia = allMedia[currentIndex];
    
    if (currentMedia.type === 'image') {
      const timer = setTimeout(() => {
        handleNext();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, allMedia.length, allMedia]);

  if (allMedia.length === 0) {
    return <img src={fallbackImage} alt="Event Cover" className="w-full h-full object-cover bg-emerald-50" />;
  }

  const currentMedia = allMedia[currentIndex];

  return (
    <div className="relative w-full h-full bg-black/90 flex items-center justify-center group overflow-hidden">
      {currentMedia.type === 'video' ? (
        <video 
          key={currentMedia.url}
          src={currentMedia.url} 
          autoPlay 
          muted 
          controls 
          playsInline 
          onEnded={handleNext} 
          className="w-full h-full object-cover" 
        />
      ) : (
        <img 
          src={currentMedia.url} 
          alt="Event Media" 
          className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" 
        />
      )}

      {allMedia.length > 1 && (
        <>
          <button 
            onClick={(e) => { e.preventDefault(); handlePrev(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/80 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition z-10 backdrop-blur-sm"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button 
            onClick={(e) => { e.preventDefault(); handleNext(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/80 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition z-10 backdrop-blur-sm"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 bg-black/30 px-3 py-1.5 rounded-full backdrop-blur-md">
            {allMedia.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-5 bg-emerald-400' : 'w-2 bg-white/60'}`} 
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// --- Interactive Likes & Comments Component ---
const EventInteractions = ({ eventId, initialLikes = [], initialComments = [], user }: any) => {
  const [likes, setLikes] = useState(initialLikes.length || 0);
  const [isLiked, setIsLiked] = useState(user ? initialLikes.includes(user.id) : false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState(initialComments || []);
  const [newComment, setNewComment] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  const handleLike = async () => {
    if (!user) return alert("Please sign in to like posts.");
    setIsLiked(!isLiked);
    setLikes((prev: number) => isLiked ? prev - 1 : prev + 1);
    
    try {
      await fetch(`/api/events/${eventId}/like`, { 
        method: "POST", 
        body: JSON.stringify({ userId: user.id }),
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Failed to toggle like");
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;
    
    setIsPosting(true);
    const commentObj = {
      id: Date.now().toString(),
      userName: user.fullName || "Member",
      userImage: user.imageUrl,
      text: newComment,
      date: new Date().toLocaleDateString()
    };
    
    setComments([...comments, commentObj]);
    setNewComment("");

    try {
      await fetch(`/api/events/${eventId}/comment`, {
        method: "POST",
        body: JSON.stringify(commentObj),
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Failed to post comment");
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="mt-5 border-t border-gray-100 pt-4 w-full">
      <div className="flex items-center gap-6 mb-4">
        <button onClick={handleLike} className={`flex items-center gap-2 font-bold text-sm transition ${isLiked ? 'text-rose-500' : 'text-gray-500 hover:text-rose-500'}`}>
          <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
          <span>{likes} {likes === 1 ? 'Like' : 'Likes'}</span>
        </button>
        <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-2 font-bold text-sm text-gray-500 hover:text-emerald-600 transition">
          <MessageSquare className="h-5 w-5" />
          <span>{comments.length} Comments</span>
        </button>
      </div>

      {showComments && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="max-h-48 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {comments.length === 0 ? (
              <p className="text-xs text-gray-400 text-center italic py-2">No comments yet. Be the first!</p>
            ) : (
              comments.map((c: any) => (
                <div key={c.id} className="bg-gray-50 p-3 rounded-2xl flex gap-3">
                  <img src={c.userImage || `https://ui-avatars.com/api/?name=${c.userName}`} alt="User" className="w-8 h-8 rounded-full" />
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-sm text-gray-900">{c.userName}</span>
                      <span className="text-[10px] text-gray-400">{c.date}</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-0.5 leading-snug">{c.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {user ? (
            <form onSubmit={handlePostComment} className="flex gap-2">
              <input 
                type="text" 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..." 
                className="flex-1 bg-gray-100 border-none px-4 py-2.5 rounded-full text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
              <button disabled={!newComment.trim() || isPosting} type="submit" className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white p-2.5 rounded-full transition">
                {isPosting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
          ) : (
            <p className="text-xs text-center text-gray-500 bg-gray-50 py-2 rounded-xl">Please sign in to join the conversation.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default function EventsPage() {
  const { user, isLoaded } = useUser();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // User RSVP statuses: map of eventId -> "Paid" | "Not Yet Paid"
  const [userRsvpStatus, setUserRsvpStatus] = useState<{ [eventId: string]: string }>({});

  // Modal Flow States
  const [activeModalEvent, setActiveModalEvent] = useState<any | null>(null);
  const [modalStep, setModalStep] = useState<"form" | "ask_pay" | "checkout" | "polling" | "success">("form");
  
  // Form & Payment Inputs
  const [formData, setFormData] = useState({ name: "", regNo: "", phone: "" });
  const [paymentPhone, setPaymentPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic Array Fee Configuration State
  const [paymentOptions, setPaymentOptions] = useState([
    { id: "member", label: "Registered Club Member", amount: 650 },
    { id: "first_year", label: "First Year Student", amount: 650 },
    { id: "non_member", label: "Non-Member / Associate", amount: 750 }
  ]);
  const [selectedTier, setSelectedTier] = useState<string>("member");
  const [selectedAmount, setSelectedAmount] = useState<number>(650);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/admin/events");
        const data = await res.json();
        if (data.events && data.events.length > 0) {
          setEvents(data.events);
        }

        if (user) {
          const userActivity = await fetch(`/api/account/activity?clerkId=${user.id}`);
          const actData = await userActivity.json();
          if (actData.rsvps) {
            const statusMap: { [key: string]: string } = {};
            actData.rsvps.forEach((r: any) => {
              statusMap[r.eventName] = r.paymentStatus || "Not Yet Paid";
            });
            setUserRsvpStatus(statusMap);
          }
        }
      } catch (err) {
        console.error("Failed to load events data:", err);
      }

      try {
        const feeRes = await fetch("/api/admin/fees");
        if (feeRes.ok) {
          const feeData = await feeRes.json();
          if (feeData && feeData.eventTiers && Array.isArray(feeData.eventTiers) && feeData.eventTiers.length > 0) {
            setPaymentOptions(feeData.eventTiers);
            setSelectedTier(feeData.eventTiers[0].id);
            setSelectedAmount(feeData.eventTiers[0].amount);
          } else if (feeData && feeData.eventMember) {
            const legacyOptions = [
              { id: "member", label: "Registered Club Member", amount: feeData.eventMember },
              { id: "first_year", label: "First Year Student", amount: feeData.eventMember },
              { id: "non_member", label: "Non-Member / Associate", amount: feeData.eventNonMember }
            ];
            setPaymentOptions(legacyOptions);
            setSelectedTier(legacyOptions[0].id);
            setSelectedAmount(legacyOptions[0].amount);
          }
        }
      } catch (error) {
        console.log("Using fallback default fee structures.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: user.fullName || "",
      }));
    }
  }, [user]);

  const handleTierChange = (tierId: string) => {
    setSelectedTier(tierId);
    const selectedOption = paymentOptions.find(opt => opt.id === tierId);
    if (selectedOption) {
      setSelectedAmount(selectedOption.amount);
    }
  };

  const handleOpenModal = (event: any, directToPay: boolean = false) => {
    setActiveModalEvent(event);
    if (directToPay) {
      setPaymentPhone(formData.phone);
      setModalStep("checkout");
    } else {
      setModalStep("form");
    }
  };

  const handleCloseModal = () => {
    setActiveModalEvent(null);
    setModalStep("form");
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalEvent || !user) return;
    setIsSubmitting(true);

    try {
      // Check if event is strictly free
      const isFreeEvent = activeModalEvent.isFree === true;

      const res = await fetch("/api/admin/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: user.id,
          fullName: formData.name,
          phone: formData.phone,
          phoneNumber: formData.phone,
          registrationNumber: formData.regNo,
          email: user.primaryEmailAddress?.emailAddress || "",
          eventName: activeModalEvent.title,
          paymentStatus: isFreeEvent ? "Paid" : "Not Yet Paid",
          amountPaid: isFreeEvent ? 0 : 0
        }),
      });

      if (res.ok) {
        setPaymentPhone(formData.phone); 
        if (isFreeEvent) {
          setUserRsvpStatus(prev => ({ ...prev, [activeModalEvent.title]: "Paid" }));
          setModalStep("success");
          setTimeout(() => handleCloseModal(), 2000);
        } else {
          setUserRsvpStatus(prev => ({ ...prev, [activeModalEvent.title]: "Not Yet Paid" }));
          setModalStep("ask_pay");
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Failed to submit application: ${errData.error || "Please try again."}`);
      }
    } catch (error) {
      alert("An error occurred during submission.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // REAL LIVE SAFARICOM DARAJA PAYMENT INTEGRATION
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
          fullName: user?.fullName || formData.name || "Member",
          phone: paymentPhone,
          amount: selectedAmount,
          category: "Event Registration",
          reference: activeModalEvent?.title || "Event Payment"
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
            
            // Mark local state as paid to update UI
            if (activeModalEvent) {
              setUserRsvpStatus(prev => ({ ...prev, [activeModalEvent.title]: "Paid" }));
            }
            setModalStep("success");
            
            // Auto-close modal after 3 seconds
            setTimeout(() => {
              handleCloseModal();
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

  if (!isLoaded) return null;

  const dynamicUpcoming = events.filter((e) => e.category === "upcoming");
  const upcomingEvents = dynamicUpcoming.length > 0 ? dynamicUpcoming : FALLBACK_UPCOMING;

  const dynamicPrevious = events.filter((e) => e.category === "previous");
  const previousEvents = dynamicPrevious.length > 0 ? dynamicPrevious : FALLBACK_PREVIOUS;

  const dynamicProjects = events.filter((e) => e.category === "project");
  const ongoingProjects = dynamicProjects.length > 0 ? dynamicProjects : FALLBACK_PROJECTS;

  return (
    <div className="p-6 sm:p-8 lg:p-12 max-w-7xl mx-auto space-y-12 relative font-sans">
      
      {/* Header */}
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl sm:text-4xl font-black text-emerald-950 tracking-tight">Events & Activities</h1>
        <p className="text-sm sm:text-base text-gray-500 mt-2 max-w-2xl">
          Sign up for upcoming excursions, connect with nature, and browse through our past club highlights.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* Upcoming Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                <Calendar className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-black text-emerald-950">Upcoming Events</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              {upcomingEvents.map((event) => {
                const status = userRsvpStatus[event.title];
                const isFree = event.isFree === true;

                return (
                  <div key={event._id} className="flex flex-col md:flex-row bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition">
                    <div className="md:w-2/5 h-64 md:h-auto relative bg-gray-100">
                      <EventMediaCarousel event={event} fallbackImage="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=1000" />
                      <div className="absolute top-4 left-4 bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md z-20">
                        {isFree ? "Free Event" : (event.status || "Registration Open")}
                      </div>
                    </div>
                    
                    <div className="p-6 sm:p-8 md:w-3/5 flex flex-col justify-between space-y-6">
                      <div className="space-y-4">
                        <h3 className="text-2xl font-bold text-gray-900">{event.title}</h3>
                        <div className="flex flex-wrap gap-4 text-xs font-semibold text-emerald-700">
                          <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg">
                            <Calendar className="h-4 w-4" /> <span>{event.date}</span>
                          </div>
                          {event.time && (
                            <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg">
                              <Clock className="h-4 w-4" /> <span>{event.time}</span>
                            </div>
                          )}
                          {event.location && (
                            <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg">
                              <MapPin className="h-4 w-4" /> <span>{event.location}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{event.description}</p>
                      </div>

                      <div>
                        {status === "Paid" ? (
                          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-6 py-3 rounded-xl text-sm font-bold">
                            <CheckCircle className="h-5 w-5" /> Secured {isFree ? "" : "& Paid"}
                          </div>
                        ) : status === "Not Yet Paid" && !isFree ? (
                          <div className="flex flex-col gap-3">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 px-4 py-2.5 rounded-xl text-xs font-bold">
                                <AlertCircle className="h-4 w-4" /> Applied (Not Yet Paid)
                              </span>
                              <button 
                                onClick={() => handleOpenModal(event, true)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm"
                              >
                                Complete Payment
                              </button>
                            </div>
                            <button 
                              onClick={() => handleOpenModal(event, true)}
                              className="text-xs text-gray-500 hover:text-emerald-700 font-bold transition text-left flex items-center gap-1.5 w-max ml-1"
                            >
                              <AlertCircle className="h-4 w-4" /> Did your payment fail or delay? Retry Here
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleOpenModal(event, false)}
                            className="bg-emerald-900 hover:bg-emerald-800 text-white px-6 py-3 rounded-xl text-sm font-bold transition shadow-sm w-full sm:w-auto"
                          >
                            {isFree ? "Register for Free" : "Apply for Event"}
                          </button>
                        )}
                      </div>

                      {/* LIKES AND COMMENTS */}
                      <EventInteractions eventId={event._id} initialLikes={event.likes} initialComments={event.comments} user={user} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Previous Events Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 text-gray-600 rounded-lg">
                <ImageIcon className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-black text-emerald-950">Previous Events & Galleries</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {previousEvents.map((event) => (
                <div key={event._id} className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm hover:shadow-md transition flex flex-col">
                  <div className="h-48 w-full rounded-2xl overflow-hidden mb-5 bg-gray-100 relative">
                    <EventMediaCarousel event={event} fallbackImage="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1000" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{event.title}</h3>
                  <p className="text-xs font-bold text-emerald-600 mb-3">{event.date}</p>
                  <p className="text-sm text-gray-600 leading-relaxed mb-6 flex-grow whitespace-pre-wrap">{event.description}</p>
                  
                  {event.galleryLink && (
                    <a 
                      href={event.galleryLink} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-emerald-100 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition mb-4"
                    >
                      <ImageIcon className="h-4 w-4" />
                      <span>View Google Photos Gallery</span>
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  )}

                  {/* LIKES AND COMMENTS */}
                  <div className="mt-auto">
                    <EventInteractions eventId={event._id} initialLikes={event.likes} initialComments={event.comments} user={user} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Ongoing Projects & Other Events Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Ongoing Projects */}
            <section className="lg:col-span-2 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-900 text-emerald-300 rounded-lg">
                  <Leaf className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-black text-emerald-950">Ongoing Club Projects</h2>
              </div>
              
              <div className="bg-emerald-950 text-white rounded-3xl overflow-hidden shadow-lg">
                {ongoingProjects.map((project) => (
                  <div key={project._id} className="flex flex-col sm:flex-row border-b border-emerald-900 last:border-b-0">
                    <div className="sm:w-1/2 h-56 sm:h-auto bg-emerald-900 relative">
                      <EventMediaCarousel event={project} fallbackImage="https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?q=80&w=1000" />
                    </div>
                    <div className="p-6 sm:p-8 sm:w-1/2 flex flex-col justify-center">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-800/50 border border-emerald-700 text-emerald-300 text-[10px] font-bold uppercase tracking-wider mb-4 w-max">
                        <Leaf className="h-3 w-3" /> Active Initiative
                      </div>
                      <h3 className="text-xl font-bold text-white mb-3">{project.title}</h3>
                      <p className="text-sm text-emerald-100/80 leading-relaxed whitespace-pre-wrap">
                        {project.description}
                      </p>

                      {/* LIKES AND COMMENTS FOR PROJECTS (Dark Theme) */}
                      <div className="mt-4">
                        <EventInteractions eventId={project._id} initialLikes={project.likes} initialComments={project.comments} user={user} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Other Regular Events */}
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                  <Users className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-black text-emerald-950">Other Events</h2>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm h-full">
                <ul className="space-y-4">
                  {otherEvents.map((event, index) => (
                    <li key={index} className="flex items-start gap-3 p-3 rounded-2xl hover:bg-emerald-50 transition border border-transparent hover:border-emerald-100">
                      <div className="mt-0.5 h-2 w-2 bg-emerald-500 rounded-full shrink-0" />
                      <span className="text-sm text-gray-700 font-medium leading-tight">{event}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>
        </>
      )}

      {/* MULTI-STAGE RSVP & PAYMENT MODAL */}
      {activeModalEvent !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            
            <button 
              onClick={handleCloseModal}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition"
            >
              <X className="h-5 w-5" />
            </button>

            {/* STAGE 1: Event Registration Form */}
            {modalStep === "form" && (
              <>
                <div className="mb-6">
                  <h3 className="text-xl font-black text-emerald-950">Event Application</h3>
                  <p className="text-sm text-gray-500 mt-1">Submit your details to sign up for <strong>{activeModalEvent.title}</strong>.</p>
                </div>

                <form onSubmit={handleSubmitApplication} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kelvin Maina"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-emerald-600 outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Contact Phone Number</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 0712345678"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-emerald-600 outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">DeKUT Registration Number</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. C025-01-0000/2023"
                      value={formData.regNo}
                      onChange={(e) => setFormData({ ...formData, regNo: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-emerald-600 outline-none transition uppercase"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full mt-4 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-sm transition flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    <span>Confirm Application</span>
                  </button>
                </form>
              </>
            )}

            {/* STAGE 2: Congratulate & Ask Payment */}
            {modalStep === "ask_pay" && (
              <div className="text-center space-y-6 py-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-emerald-950">Congratulations! 🎉</h3>
                  <p className="text-sm text-gray-600 mt-2">
                    Your spot for <strong>{activeModalEvent.title}</strong> has been logged.
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
                    onClick={handleCloseModal}
                    className="w-full py-3.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition"
                  >
                    I'll Pay Later
                  </button>
                </div>
              </div>
            )}

            {/* STAGE 3: Select Dynamic Payment Tier & Confirm M-Pesa Phone */}
            {modalStep === "checkout" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-black text-emerald-950">M-Pesa Checkout</h3>
                  <p className="text-xs text-gray-500 mt-1">Select ticket type and confirm phone number for the STK Prompt.</p>
                </div>

                <form onSubmit={handleInitiatePayment} className="space-y-4">
                  {/* Dynamic Dropdown Tier */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Pay As</label>
                    <select 
                      value={selectedTier} 
                      onChange={(e) => handleTierChange(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 font-bold text-sm outline-none"
                    >
                      {paymentOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label} (KES {opt.amount})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Display Amount */}
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Amount Due</span>
                    <span className="text-xl font-black text-emerald-950">KES {selectedAmount}</span>
                  </div>

                  {/* Phone Input with Editable Override */}
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

            {/* STAGE 4: Waiting for M-Pesa PIN */}
            {modalStep === "polling" && (
              <div className="text-center space-y-5 py-8">
                <Smartphone className="h-12 w-12 text-emerald-600 animate-pulse mx-auto" />
                <h3 className="text-lg font-black text-emerald-950">Check your phone!</h3>
                <p className="text-sm text-gray-500 px-4">
                  An M-Pesa prompt for <strong>KES {selectedAmount}</strong> has been sent to <strong>{paymentPhone}</strong>. Enter your PIN to finalize.
                </p>
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-600 mt-4">
                  <Loader2 className="h-4 w-4 animate-spin" /> Verifying payment with Safaricom...
                </div>
              </div>
            )}

            {/* STAGE 5: Success */}
            {modalStep === "success" && (
              <div className="text-center space-y-4 py-6">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-black text-emerald-950">Payment Completed!</h3>
                <p className="text-sm text-gray-500">Your reservation has been confirmed. See you at the excursion!</p>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
