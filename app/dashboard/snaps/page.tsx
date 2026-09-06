"use client";

import { useState, useEffect } from "react";
import { Camera, Trophy, Star, Loader2, X, ZoomIn, ExternalLink, UploadCloud, Users, Medal } from "lucide-react";

const FALLBACK_WINNER = {
  _id: "default_win",
  title: "Morning Mist at Karuru Falls",
  photographer: "Elijah Mutua",
  date: "September 2026",
  description: "Captured during the Aberdare excursion, showcasing the raw power and beauty of our highland water towers.",
  imageUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=1000&auto=format&fit=crop"
};

const FALLBACK_SUBMISSIONS = [
  {
    _id: "sub_1",
    title: "Sunbird on Aloe",
    photographer: "Mercy Njoki",
    imageUrl: "https://images.unsplash.com/photo-1555169062-013468b47731?q=80&w=1000&auto=format&fit=crop"
  },
  {
    _id: "sub_2",
    title: "Campus Canopy",
    photographer: "Kelvin Maina",
    imageUrl: "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=1000&auto=format&fit=crop"
  },
  {
    _id: "sub_3",
    title: "Macro: Praying Mantis",
    photographer: "Joyline Selim",
    imageUrl: "https://images.unsplash.com/photo-1579202673506-ca3ce28943ef?q=80&w=1000&auto=format&fit=crop"
  }
];

export default function NatureSnapsPage() {
  const [snaps, setSnaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewSnap, setPreviewSnap] = useState<any | null>(null);

  useEffect(() => {
    fetch("/api/snaps")
      .then((res) => res.json())
      .then((data) => {
        if (data.snaps && data.snaps.length > 0) {
          setSnaps(data.snaps);
        } else if (Array.isArray(data) && data.length > 0) {
          setSnaps(data);
        }
      })
      .catch((err) => console.error("Failed to load snaps:", err))
      .finally(() => setLoading(false));
  }, []);

  const liveWinner = snaps.find((s) => s.type === "winner") || FALLBACK_WINNER;
  const liveSubmissions = snaps.filter((s) => s.type === "top_submission");
  const submissionsList = liveSubmissions.length > 0 ? liveSubmissions : FALLBACK_SUBMISSIONS;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 lg:p-12 max-w-7xl mx-auto space-y-10 font-sans">
      
      {/* Header & Submission Logic Explanation */}
      <div className="space-y-6 border-b border-gray-200 pb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-emerald-950 tracking-tight">Nature Snaps Wall</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">Dedan Kimathi University of Technology</p>
        </div>

        <div className="bg-emerald-900 rounded-3xl p-8 sm:p-10 shadow-lg text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-800 border border-emerald-700 text-emerald-100 text-xs font-bold uppercase tracking-wider mb-4">
                <UploadCloud className="h-4 w-4" />
                <span>Community Photo Cloud</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black mb-3 leading-tight">Explore the Full DEKUWEC Google Photos Album</h2>
              <p className="text-sm text-emerald-100 leading-relaxed">
                Have nature or wildlife shots from our excursions or around campus? Upload your captures to our collaborative Google Photos album. Best submissions are reviewed and awarded every Wednesday!
              </p>
            </div>
            <a 
              href="https://photos.app.goo.gl/Fedcqm7wGHnqsK2G9" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white text-emerald-900 font-bold px-6 py-4 rounded-xl text-sm hover:bg-emerald-50 transition shrink-0 shadow-md"
            >
              Open Google Photos Album <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="bg-gray-50 border border-gray-100 p-5 rounded-2xl flex flex-col gap-2">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
              <Camera className="h-4 w-4" /> 1. Shoot & Upload
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">Capture native wildlife, indigenous trees, insects, or landscapes and add them directly to the Google Photos album.</p>
          </div>
          <div className="bg-gray-50 border border-gray-100 p-5 rounded-2xl flex flex-col gap-2">
            <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
              <Users className="h-4 w-4" /> 2. Weekly Peer Review
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">The executive board shortlists standout shots to be spotlighted and credited on our digital wall below.</p>
          </div>
          <div className="bg-gray-50 border border-gray-100 p-5 rounded-2xl flex flex-col gap-2">
            <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
              <Medal className="h-4 w-4" /> 3. Awarded in Meetings
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">The winning photographer receives official recognition and club souvenirs during our weekly physical sessions.</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
          <Camera className="h-6 w-6" />
        </div>
        <h2 className="text-3xl font-black text-emerald-950 tracking-tight">Hall of Fame</h2>
      </div>

      {/* Main Grid: Winner on Left, Top Submissions on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Featured Winner Card */}
        <div 
          onClick={() => setPreviewSnap(liveWinner)}
          className="lg:col-span-7 bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-200 relative group cursor-pointer"
        >
          <div className="relative h-[420px] sm:h-[480px] w-full bg-gray-900">
            <img 
              src={liveWinner.imageUrl} 
              alt={liveWinner.title} 
              className="w-full h-full object-cover group-hover:scale-105 transition duration-700 opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

            <div className="absolute top-6 right-6 flex items-center gap-2">
              <span className="flex items-center gap-1.5 bg-amber-500 text-slate-950 text-xs font-black px-3.5 py-1.5 rounded-full shadow-lg">
                <Trophy className="h-3.5 w-3.5 fill-slate-950" /> Pic of the Week
              </span>
              <span className="p-2 bg-black/40 text-white rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition">
                <ZoomIn className="h-4 w-4" />
              </span>
            </div>

            {/* Bottom Details Overlay */}
            <div className="absolute bottom-6 left-6 right-6 text-white space-y-3">
              <h2 className="text-2xl sm:text-3xl font-black leading-tight drop-shadow-md">
                {liveWinner.title}
              </h2>
              {liveWinner.description && (
                <p className="text-xs sm:text-sm text-gray-200 line-clamp-2 max-w-xl drop-shadow">
                  {liveWinner.description}
                </p>
              )}

              <div className="flex items-center gap-3 pt-2">
                <div className="h-9 w-9 bg-emerald-700 text-emerald-100 rounded-full font-bold flex items-center justify-center text-sm border border-emerald-400 shrink-0">
                  {liveWinner.photographer ? liveWinner.photographer[0] : "P"}
                </div>
                <div>
                  <p className="text-sm font-bold leading-none">{liveWinner.photographer}</p>
                  <p className="text-[11px] text-gray-300 mt-0.5">{liveWinner.date || "Featured Photo"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Submissions Stacked Column */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center gap-2 pb-2">
            <Star className="h-5 w-5 text-emerald-600 fill-emerald-600" />
            <h3 className="text-lg font-black text-emerald-950">Top Submissions</h3>
          </div>

          <div className="space-y-4">
            {submissionsList.map((item: any) => (
              <div 
                key={item._id} 
                onClick={() => setPreviewSnap(item)}
                className="relative h-44 rounded-2xl overflow-hidden shadow-sm border border-gray-200 group cursor-pointer"
              >
                <img 
                  src={item.imageUrl} 
                  alt={item.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                
                <div className="absolute top-3 right-3 p-1.5 bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition">
                  <ZoomIn className="h-3.5 w-3.5" />
                </div>

                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h4 className="text-base font-bold leading-snug">{item.title}</h4>
                  <p className="text-xs text-emerald-300 font-medium mt-0.5">by {item.photographer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Interactive Lightbox Modal */}
      {previewSnap && (
        <div 
          onClick={() => setPreviewSnap(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative bg-emerald-950 border border-emerald-900/60 rounded-3xl overflow-hidden max-w-4xl w-full text-white shadow-2xl"
          >
            <button 
              onClick={() => setPreviewSnap(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="max-h-[75vh] w-full bg-black flex items-center justify-center overflow-hidden">
              <img 
                src={previewSnap.imageUrl} 
                alt={previewSnap.title} 
                className="w-full h-full max-h-[75vh] object-contain" 
              />
            </div>

            <div className="p-6 sm:p-8 space-y-2 bg-gradient-to-b from-emerald-950 to-slate-950">
              <div className="flex items-center justify-between">
                <h3 className="text-xl sm:text-2xl font-black">{previewSnap.title}</h3>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-900/60 border border-emerald-800 px-3 py-1 rounded-full">
                  Captured by {previewSnap.photographer}
                </span>
              </div>
              {previewSnap.description && (
                <p className="text-sm text-gray-300 leading-relaxed pt-1">
                  {previewSnap.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
