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
  Loader2
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
    category: "upcoming"
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
    category: "previous"
  },
  {
    _id: "default_prev_2",
    title: "Club Fun Day at Farm House",
    date: "June 27, 2026",
    description: "A fantastic day of outdoor activities, board games, colorfest, and team-building in partnership with AYLF.",
    imageUrl: "https://images.unsplash.com/photo-1526976663112-0058b76c8cb9?q=80&w=1000&auto=format&fit=crop",
    galleryLink: "https://photos.google.com",
    category: "previous"
  }
];

const FALLBACK_PROJECTS = [
  {
    _id: "default_proj_1",
    title: "Campus Tree Nursery Establishment",
    description: "A continuous club initiative to cultivate indigenous tree seedlings for future conservation drives and community distribution.",
    imageUrl: "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?q=80&w=1000&auto=format&fit=crop",
    category: "project"
  }
];

const otherEvents = [
  "Weekly Wednesday Physical Gatherings (5:00 PM – 6:45 PM)",
  "EcoPulse Wildlife Debates",
  "Monthly Campus Clean-up Drives"
];

export default function EventsPage() {
  const { user, isLoaded } = useUser();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeModalEvent, setActiveModalEvent] = useState<any | null>(null);
  const [rsvpedEventIds, setRsvpedEventIds] = useState<string[]>([]);
  const [formData, setFormData] = useState({ name: "", regNo: "" });
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Live Events from MongoDB API
  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch("/api/admin/events");
        const data = await res.json();
        if (data.events && data.events.length > 0) {
          setEvents(data.events);
        }
      } catch (err) {
        console.error("Failed to load events:", err);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  // Pre-fill user data once Clerk loads
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: user.fullName || "",
      }));
    }
  }, [user]);

  const handleOpenModal = (event: any) => {
    setActiveModalEvent(event);
    setShowSuccess(false);
  };

  const handleCloseModal = () => {
    setActiveModalEvent(null);
    setFormData({ 
      name: user?.fullName || "", 
      regNo: "" 
    });
  };

  const handleSubmitRSVP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalEvent || !user) return;

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: user.id,
          fullName: `${formData.name} (${formData.regNo})`.trim(),
          email: user.primaryEmailAddress?.emailAddress || "",
          eventName: activeModalEvent.title,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setRsvpedEventIds((prev) => [...prev, activeModalEvent._id]);
        setShowSuccess(true);
        setTimeout(() => {
          handleCloseModal();
        }, 2200);
      } else {
        alert(data.error || "Failed to register. Please try again.");
      }
    } catch (error) {
      console.error("RSVP Error:", error);
      alert("An error occurred while submitting your registration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoaded) return null;

  // Filter dynamic lists, falling back to initial data if none are added yet
  const dynamicUpcoming = events.filter((e) => e.category === "upcoming");
  const upcomingEvents = dynamicUpcoming.length > 0 ? dynamicUpcoming : FALLBACK_UPCOMING;

  const dynamicPrevious = events.filter((e) => e.category === "previous");
  const previousEvents = dynamicPrevious.length > 0 ? dynamicPrevious : FALLBACK_PREVIOUS;

  const dynamicProjects = events.filter((e) => e.category === "project");
  const ongoingProjects = dynamicProjects.length > 0 ? dynamicProjects : FALLBACK_PROJECTS;

  return (
    <div className="p-6 sm:p-8 lg:p-12 max-w-7xl mx-auto space-y-12 relative font-sans">
      
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl sm:text-4xl font-black text-emerald-950 tracking-tight">Events & Activities</h1>
        <p className="text-sm sm:text-base text-gray-500 mt-2 max-w-2xl">
          Discover upcoming expeditions, browse galleries of our past adventures, and see the long-term conservation projects our members are driving.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* 1. Upcoming Events Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                <Calendar className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-black text-emerald-950">Upcoming Events</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              {upcomingEvents.map((event) => {
                const hasRSVPd = rsvpedEventIds.includes(event._id);
                
                return (
                  <div key={event._id} className="flex flex-col md:flex-row bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition">
                    <div className="md:w-2/5 h-64 md:h-auto relative bg-gray-100">
                      <img 
                        src={event.imageUrl || "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=1000"} 
                        alt={event.title} 
                        className="w-full h-full object-cover" 
                      />
                      <div className="absolute top-4 left-4 bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md">
                        {event.status || "Registration Open"}
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
                        <p className="text-sm text-gray-600 leading-relaxed">{event.description}</p>
                      </div>

                      <div>
                        {hasRSVPd ? (
                          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-6 py-3 rounded-xl text-sm font-bold">
                            <CheckCircle className="h-5 w-5" />
                            Participation Confirmed
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleOpenModal(event)}
                            className="bg-emerald-900 hover:bg-emerald-800 text-white px-6 py-3 rounded-xl text-sm font-bold transition shadow-sm w-full sm:w-auto"
                          >
                            Do you want to participate?
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 2. Previous Events Section */}
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
                  <div className="h-48 w-full rounded-2xl overflow-hidden mb-5 bg-gray-100">
                    <img 
                      src={event.imageUrl || "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1000"} 
                      alt={event.title} 
                      className="w-full h-full object-cover hover:scale-105 transition duration-500" 
                    />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{event.title}</h3>
                  <p className="text-xs font-bold text-emerald-600 mb-3">{event.date}</p>
                  <p className="text-sm text-gray-600 leading-relaxed mb-6 flex-grow">{event.description}</p>
                  
                  {event.galleryLink && (
                    <a 
                      href={event.galleryLink} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-emerald-100 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition"
                    >
                      <ImageIcon className="h-4 w-4" />
                      <span>View Google Photos Gallery</span>
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* 3. Ongoing Projects & Other Events Grid */}
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
                  <div key={project._id} className="flex flex-col sm:flex-row">
                    <div className="sm:w-1/2 h-56 sm:h-auto bg-emerald-900">
                      <img 
                        src={project.imageUrl || "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?q=80&w=1000"} 
                        alt={project.title} 
                        className="w-full h-full object-cover opacity-90" 
                      />
                    </div>
                    <div className="p-6 sm:p-8 sm:w-1/2 flex flex-col justify-center">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-800/50 border border-emerald-700 text-emerald-300 text-[10px] font-bold uppercase tracking-wider mb-4 w-max">
                        <Leaf className="h-3 w-3" /> Active Initiative
                      </div>
                      <h3 className="text-xl font-bold text-white mb-3">{project.title}</h3>
                      <p className="text-sm text-emerald-100/80 leading-relaxed">
                        {project.description}
                      </p>
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

      {/* RSVP Modal Overlay */}
      {activeModalEvent !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            
            <button 
              onClick={handleCloseModal}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition"
            >
              <X className="h-5 w-5" />
            </button>

            {showSuccess ? (
              <div className="text-center space-y-4 py-6">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-black text-emerald-950">Participation Logged!</h3>
                <p className="text-sm text-gray-500">Your details have been submitted. See you at the event!</p>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h3 className="text-xl font-black text-emerald-950">Event Participation</h3>
                  <p className="text-sm text-gray-500 mt-1">Submit your details to secure your spot for <strong>{activeModalEvent.title}</strong>.</p>
                </div>

                <form onSubmit={handleSubmitRSVP} className="space-y-4">
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
                    <span>{isSubmitting ? "Processing..." : "Confirm Participation"}</span>
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
