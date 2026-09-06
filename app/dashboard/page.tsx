"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { 
  CalendarDays, 
  Radio, 
  Camera, 
  Users,
  Megaphone,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Loader2
} from "lucide-react";

// Fallback slides ensuring the UI always looks good even if the database is completely empty
const FALLBACK_SLIDES = [
  {
    id: "fallback_1",
    category: "Welcome to DEKUWEC",
    icon: <CalendarDays className="h-4 w-4" />,
    title: "Your Gateway to Conservation",
    description: "Join our student expeditions, restore native highland biodiversity, and protect critical water towers.",
    image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=2000&auto=format&fit=crop",
    link: "/dashboard/events",
  }
];

export default function DashboardHomePage() {
  const { user } = useUser();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch LIVE Data from MongoDB (Only real posted things)
  useEffect(() => {
    async function fetchLiveHighlights() {
      try {
        const [eventsRes, ecoRes, snapsRes, notifRes] = await Promise.all([
          fetch('/api/admin/events').catch(() => null),
          fetch('/api/ecopulse').catch(() => null),
          fetch('/api/snaps').catch(() => null),
          user ? fetch(`/api/notifications?clerkId=${user.id}`).catch(() => null) : Promise.resolve(null)
        ]);

        const eventsData = eventsRes?.ok ? await eventsRes.json() : { events: [] };
        const ecoData = ecoRes?.ok ? await ecoRes.json() : [];
        const snapsData = snapsRes?.ok ? await snapsRes.json() : [];
        const notifData = notifRes?.ok ? await notifRes.json() : { notifications: [] };

        const fetchedSlides = [];

        // 1. Grab the latest Admin Broadcast Alert (Highest Priority)
        const latestBroadcast = notifData.notifications?.find((n: any) => n.type === "admin_alert");
        if (latestBroadcast) {
          fetchedSlides.push({
            id: `brd_${latestBroadcast._id}`,
            category: "Admin Broadcast",
            icon: <Megaphone className="h-4 w-4" />,
            title: latestBroadcast.title.replace("📢 ", ""),
            description: latestBroadcast.message,
            image: latestBroadcast.imageUrl || "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=2000",
            link: latestBroadcast.link || "/dashboard",
          });
        }

        // 2. Grab the latest Event
        const latestEvent = eventsData.events?.[0];
        if (latestEvent) {
          fetchedSlides.push({
            id: `evt_${latestEvent._id}`,
            category: "Events & Activities",
            icon: <CalendarDays className="h-4 w-4" />,
            title: latestEvent.title,
            description: latestEvent.description,
            image: latestEvent.imageUrl || "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=2000",
            link: "/dashboard/events",
          });
        }

        // 3. Grab the latest Nature Snap
        if (snapsData.length > 0) {
          fetchedSlides.push({
            id: `snp_${snapsData[0]._id}`,
            category: "Nature Snaps",
            icon: <Camera className="h-4 w-4" />,
            title: snapsData[0].title,
            description: `Captured by ${snapsData[0].photographer}. ${snapsData[0].description}`,
            image: snapsData[0].imageUrl,
            link: "/dashboard/snaps",
          });
        }

        // 4. Grab the latest EcoPulse Post
        if (ecoData.length > 0) {
          fetchedSlides.push({
            id: `eco_${ecoData[0]._id}`,
            category: "EcoPulse Dispatch",
            icon: <Radio className="h-4 w-4" />,
            title: ecoData[0].title,
            description: ecoData[0].content,
            image: ecoData[0].imageUrl || "https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?q=80&w=2000",
            link: "/dashboard/dispatch",
          });
        }

        if (fetchedSlides.length > 0) {
          setSlides(fetchedSlides);
        } else {
          setSlides(FALLBACK_SLIDES); // Show fallback if DB is completely empty
        }
      } catch (error) {
        console.error("Failed to fetch live slides", error);
        setSlides(FALLBACK_SLIDES);
      } finally {
        setLoading(false);
      }
    }

    fetchLiveHighlights();
  }, [user]);

  // Auto-advance slider every 6 seconds continuously
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const nextSlide = () => setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  const prevSlide = () => setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));

  return (
    <div className="p-4 sm:p-8 lg:p-12 space-y-8 lg:space-y-12 max-w-[1400px] mx-auto">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-emerald-950">DEKUWEC Portal</h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">Dedan Kimathi University of Technology</p>
        </div>
      </div>

      {/* Dynamic Image Slider Banner */}
      <div className="relative w-full h-[60vh] min-h-[350px] max-h-[500px] rounded-3xl overflow-hidden shadow-2xl group bg-emerald-950">
        
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 z-30">
            <Loader2 className="h-10 w-10 text-emerald-600 animate-spin mb-4" />
            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Loading Live Updates...</p>
          </div>
        ) : (
          <>
            {/* Images */}
            {slides.map((slide, index) => (
              <div 
                key={slide.id}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
              >
                {/* Changed to object-contain so event flyers don't get chopped off! */}
                <img 
                  src={slide.image} 
                  alt={slide.title} 
                  className="w-full h-full object-cover opacity-80"
                />
                {/* Gradient Overlay for Text Readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/70 to-transparent"></div>
              </div>
            ))}

            {/* Content Overlay */}
            <div className="absolute inset-0 z-20 flex flex-col justify-end p-6 sm:p-10">
              <div className="max-w-3xl space-y-4">
                
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur-md border border-white/20 text-white text-xs font-bold uppercase tracking-wider">
                  {slides[currentSlide]?.icon}
                  <span>{slides[currentSlide]?.category}</span>
                </div>
                
                <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white leading-tight drop-shadow-lg line-clamp-2">
                  {slides[currentSlide]?.title}
                </h2>
                
                <p className="text-sm sm:text-base text-emerald-50 leading-relaxed max-w-2xl line-clamp-2 sm:line-clamp-3">
                  {slides[currentSlide]?.description}
                </p>
                
                <div className="pt-4">
                  <Link
                    href={slides[currentSlide]?.link || "/dashboard"}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm transition shadow-lg shadow-emerald-500/20"
                  >
                    <span>Explore Further</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Slider Controls */}
            {slides.length > 1 && (
              <>
                <button 
                  onClick={prevSlide}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-3 rounded-full bg-black/30 hover:bg-black/60 backdrop-blur-sm text-white border border-white/20 transition opacity-0 group-hover:opacity-100 hidden sm:block"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button 
                  onClick={nextSlide}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-3 rounded-full bg-black/30 hover:bg-black/60 backdrop-blur-sm text-white border border-white/20 transition opacity-0 group-hover:opacity-100 hidden sm:block"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>

                {/* Pagination Dots */}
                <div className="absolute bottom-6 right-6 z-30 flex gap-2">
                  {slides.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`transition-all duration-300 rounded-full ${index === currentSlide ? 'w-8 h-2 bg-emerald-400' : 'w-2 h-2 bg-white/50 hover:bg-white'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Explore DEKUWEC Hubs Section */}
      <div className="space-y-6 pt-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-emerald-950">Explore DEKUWEC Hubs</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Direct access to our club functions and activities.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Link href="/dashboard/events" className="p-6 rounded-3xl bg-white border border-gray-100 hover:border-emerald-300 hover:shadow-md transition space-y-4 group">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base mb-1">Events & Activities</h3>
              <p className="text-xs text-gray-500 leading-relaxed">Hikes, tree planting drives, cleanups, and game drives.</p>
            </div>
          </Link>

          <Link href="/dashboard/dispatch" className="p-6 rounded-3xl bg-white border border-gray-100 hover:border-blue-300 hover:shadow-md transition space-y-4 group">
            <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
              <Radio className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base mb-1">EcoPulse Dispatch</h3>
              <p className="text-xs text-gray-500 leading-relaxed">Club newsletters, announcements, and climate articles.</p>
            </div>
          </Link>

          <Link href="/dashboard/snaps" className="p-6 rounded-3xl bg-white border border-gray-100 hover:border-amber-300 hover:shadow-md transition space-y-4 group">
            <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors duration-300">
              <Camera className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base mb-1">Nature Snaps</h3>
              <p className="text-xs text-gray-500 leading-relaxed">Student wildlife photography and field gallery.</p>
            </div>
          </Link>

          <Link href="/dashboard/membership" className="p-6 rounded-3xl bg-white border border-gray-100 hover:border-purple-300 hover:shadow-md transition space-y-4 group">
            <div className="h-12 w-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base mb-1">Membership Portal</h3>
              <p className="text-xs text-gray-500 leading-relaxed">Verify student status and access club privileges.</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
