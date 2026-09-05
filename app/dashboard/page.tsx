"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  CalendarDays, 
  Radio, 
  Camera, 
  Users,
  ChevronLeft,
  ChevronRight,
  ArrowRight
} from "lucide-react";

// Simulated dynamic content from other tabs
const featuredSlides = [
  {
    id: 1,
    category: "Events & Activities",
    icon: <CalendarDays className="h-4 w-4" />,
    title: "Aberdare Forest Tree Planting Drive",
    description: "Join our next student expedition restoring native highland biodiversity and protecting critical water towers. Transport provided from Main Gate.",
    image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=2000&auto=format&fit=crop",
    link: "/dashboard/events",
    color: "bg-emerald-500",
  },
  {
    id: 2,
    category: "Nature Snaps",
    icon: <Camera className="h-4 w-4" />,
    title: "Captured: The Big Tuskers of Tsavo",
    description: "Incredible student photography from last weekend's game drive. Vote for your favorite wildlife shot in the gallery.",
    image: "https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?q=80&w=2000&auto=format&fit=crop",
    link: "/dashboard/snaps",
    color: "bg-amber-500",
  },
  {
    id: 3,
    category: "EcoPulse Dispatch",
    icon: <Radio className="h-4 w-4" />,
    title: "Climate Action: Campus Waste Audit",
    description: "Read the latest dispatch on how DEKUWEC members are leading the new recycling initiative at the university student center.",
    image: "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=2000&auto=format&fit=crop",
    link: "/dashboard/dispatch",
    color: "bg-blue-500",
  }
];

export default function DashboardHomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-advance slider every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev === featuredSlides.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev === featuredSlides.length - 1 ? 0 : prev + 1));
  const prevSlide = () => setCurrentSlide((prev) => (prev === 0 ? featuredSlides.length - 1 : prev - 1));

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
      <div className="relative w-full h-[60vh] min-h-[350px] max-h-[500px] rounded-3xl overflow-hidden shadow-2xl group">
        
        {/* Images */}
        {featuredSlides.map((slide, index) => (
          <div 
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
          >
            <img 
              src={slide.image} 
              alt={slide.title} 
              className="w-full h-full object-cover"
            />
            {/* Gradient Overlay for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/60 to-transparent"></div>
          </div>
        ))}

        {/* Content Overlay */}
        <div className="absolute inset-0 z-20 flex flex-col justify-end p-6 sm:p-10">
          <div className="max-w-3xl space-y-4">
            
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/30 backdrop-blur-md border border-white/20 text-white text-xs font-bold uppercase tracking-wider">
              {featuredSlides[currentSlide].icon}
              <span>{featuredSlides[currentSlide].category}</span>
            </div>
            
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white leading-tight drop-shadow-lg">
              {featuredSlides[currentSlide].title}
            </h2>
            
            <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed max-w-2xl line-clamp-2 sm:line-clamp-none">
              {featuredSlides[currentSlide].description}
            </p>
            
            <div className="pt-4">
              <Link
                href={featuredSlides[currentSlide].link}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm transition shadow-lg shadow-emerald-500/20"
              >
                <span>Read More</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Slider Controls (Hidden on very small mobile) */}
        <button 
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-3 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm text-white border border-white/20 transition opacity-0 group-hover:opacity-100 hidden sm:block"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button 
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-3 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm text-white border border-white/20 transition opacity-0 group-hover:opacity-100 hidden sm:block"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        {/* Pagination Dots */}
        <div className="absolute bottom-6 right-6 z-30 flex gap-2">
          {featuredSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`transition-all duration-300 rounded-full ${index === currentSlide ? 'w-8 h-2 bg-emerald-400' : 'w-2 h-2 bg-white/50 hover:bg-white'}`}
            />
          ))}
        </div>
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
