"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { 
  Camera, Trophy, Star, Loader2, X, ZoomIn, ExternalLink, 
  UploadCloud, Users, Medal, Cloud, Send, ThumbsUp, ThumbsDown, Trash2 
} from "lucide-react";

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
  const { user, isLoaded } = useUser();
  const [snaps, setSnaps] = useState<any[]>([]);
  const [communitySnaps, setCommunitySnaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewSnap, setPreviewSnap] = useState<any | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadForm, setUploadForm] = useState({ imageUrl: "", caption: "" });

  useEffect(() => {
    Promise.all([
      fetch("/api/snaps").then(res => res.json()),
      fetch("/api/community-snaps").then(res => res.json())
    ])
    .then(([officialData, communityData]) => {
      if (officialData.snaps) setSnaps(officialData.snaps);
      else if (Array.isArray(officialData)) setSnaps(officialData);

      if (communityData.snaps) setCommunitySnaps(communityData.snaps);
    })
    .catch((err) => console.error("Failed to load snaps:", err))
    .finally(() => setLoading(false));
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      
      if (res.ok) {
        const data = await res.json();
        setUploadForm(prev => ({ ...prev, imageUrl: data.secure_url || data.url }));
      } else {
        alert("Image upload failed.");
      }
    } catch (err) {
      alert("Error connecting to upload service.");
    } finally {
      setIsUploading(false);
      e.target.value = ""; 
    }
  };

  const handlePublishSnap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.imageUrl || !user) return alert("Please upload an image first.");

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/community-snaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: user.id,
          fullName: user.fullName || "Member",
          userProfilePic: user.imageUrl,
          imageUrl: uploadForm.imageUrl,
          caption: uploadForm.caption
        }),
      });

      if (res.ok) {
        setUploadForm({ imageUrl: "", caption: "" });
        const commRes = await fetch("/api/community-snaps");
        const commData = await commRes.json();
        if (commData.snaps) setCommunitySnaps(commData.snaps);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInteraction = async (snapId: string, currentAction: "like" | "dislike") => {
    if (!user) return;

    setCommunitySnaps(prev => prev.map(snap => {
      if (snap._id !== snapId) return snap;
      
      const hasLiked = snap.likes.includes(user.id);
      const hasDisliked = snap.dislikes.includes(user.id);
      
      let newLikes = snap.likes.filter((id: string) => id !== user.id);
      let newDislikes = snap.dislikes.filter((id: string) => id !== user.id);

      // FIX: Added 'remove' to the explicit type definition
      let finalAction: "like" | "dislike" | "remove" = currentAction;
      
      if (currentAction === "like") {
        if (hasLiked) finalAction = "remove"; 
        else newLikes.push(user.id);
      } else if (currentAction === "dislike") {
        if (hasDisliked) finalAction = "remove"; 
        else newDislikes.push(user.id);
      }

      fetch("/api/community-snaps/interact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapId, clerkId: user.id, action: finalAction, likerName: user.fullName || "A member" })
      });

      return { ...snap, likes: newLikes, dislikes: newDislikes };
    }));
  };

  // NEW: Secure user deletion logic
  const handleDeleteOwnSnap = async (snapId: string) => {
    if (!confirm("Are you sure you want to delete this photo from the community wall?")) return;
    if (!user) return;
    
    try {
      const res = await fetch(`/api/community-snaps?id=${snapId}&clerkId=${user.id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        setCommunitySnaps(prev => prev.filter(snap => snap._id !== snapId));
      } else {
        alert("Failed to delete photo.");
      }
    } catch (err) {
      console.error("Delete error", err);
    }
  };

  const liveWinner = snaps.find((s) => s.type === "winner") || FALLBACK_WINNER;
  const liveSubmissions = snaps.filter((s) => s.type === "top_submission");
  const submissionsList = liveSubmissions.length > 0 ? liveSubmissions : FALLBACK_SUBMISSIONS;

  if (loading || !isLoaded) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 lg:p-12 max-w-7xl mx-auto space-y-10 font-sans">
      
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

      <div className="w-full h-px bg-gray-200 my-8"></div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Side: Upload Form */}
        <div className="lg:col-span-1 bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm sticky top-24">
          <h2 className="text-xl font-black text-emerald-950 mb-2">Weekly Challenge</h2>
          <p className="text-xs text-gray-500 mb-6">Submit your best campus or excursion capture for the community to vote on!</p>

          <form onSubmit={handlePublishSnap} className="space-y-4">
            <div className="w-full flex flex-col justify-center border-2 border-dashed border-emerald-200 bg-emerald-50/50 rounded-2xl p-4 text-center">
              {uploadForm.imageUrl ? (
                <div className="relative w-full aspect-square rounded-xl overflow-hidden shadow-sm group">
                  <img src={uploadForm.imageUrl} alt="Upload Preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setUploadForm({ ...uploadForm, imageUrl: "" })} className="absolute top-2 right-2 bg-rose-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition shadow-md z-10">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center">
                  <div className="h-12 w-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <label className="cursor-pointer text-sm font-bold text-emerald-700 hover:text-emerald-800 transition">
                    Browse Files to Upload
                    <input type="file" accept="image/*" className="hidden" disabled={isUploading} onChange={handleImageUpload} />
                  </label>
                  <p className="text-[10px] text-gray-400 mt-1">Supports JPG, PNG (Max 5MB)</p>
                </div>
              )}
              {isUploading && <p className="text-xs font-bold text-emerald-600 mt-3 flex items-center justify-center gap-1"><Loader2 className="h-3 w-3 animate-spin"/> Uploading...</p>}
            </div>

            <textarea
              rows={2}
              required
              placeholder="Write a short caption or location..."
              value={uploadForm.caption}
              onChange={(e) => setUploadForm({ ...uploadForm, caption: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-emerald-600 outline-none transition resize-none"
            />

            <button
              type="submit"
              disabled={isSubmitting || isUploading || !uploadForm.imageUrl}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold py-3.5 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-md"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span>Post to Community Wall</span>
            </button>
          </form>
        </div>

        {/* Right Side: Community Feed */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-black text-emerald-950 flex items-center gap-2">
            Community Submissions
          </h2>

          {communitySnaps.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-gray-100">
              <Camera className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No snaps submitted this week yet. Be the first!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {communitySnaps.map((snap) => {
                const hasLiked = snap.likes.includes(user?.id);
                const hasDisliked = snap.dislikes.includes(user?.id);
                const isOwner = user?.id === snap.clerkId; // Identify if the current user uploaded this snap

                return (
                  <div key={snap._id} className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm flex flex-col">
                    <div className="p-4 flex items-center gap-3 border-b border-gray-50">
                      <img src={snap.userProfilePic || "https://i.postimg.cc/qB9gLwmz/Whats-App-Image-2026-09-03-at-09-49-04.jpg"} alt="Profile" className="h-8 w-8 rounded-full object-cover border border-gray-200" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-gray-900 truncate">{snap.fullName}</h4>
                        <p className="text-[10px] text-gray-400">{new Date(snap.createdAt).toLocaleDateString()}</p>
                      </div>
                      
                      {/* NEW: Conditional Delete Button for the Owner */}
                      {isOwner && (
                        <button 
                          onClick={() => handleDeleteOwnSnap(snap._id)}
                          className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition"
                          title="Delete my photo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div 
                      className="aspect-square bg-gray-100 relative cursor-pointer group"
                      onClick={() => setPreviewSnap({ ...snap, photographer: snap.fullName, title: snap.caption || "Community Snap" })}
                    >
                      <img src={snap.imageUrl} alt="Community Snap" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <ZoomIn className="text-white h-8 w-8" />
                      </div>
                    </div>

                    <div className="p-4 flex flex-col flex-grow">
                      <p className="text-sm text-gray-700 mb-4 line-clamp-2">{snap.caption}</p>
                      
                      <div className="flex items-center gap-3 mt-auto pt-2 border-t border-gray-50">
                        <button 
                          onClick={() => handleInteraction(snap._id, "like")}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${hasLiked ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-50 text-gray-600 hover:bg-emerald-50'}`}
                        >
                          <ThumbsUp className={`h-4 w-4 ${hasLiked ? 'fill-emerald-600' : ''}`} /> {snap.likes.length}
                        </button>
                        <button 
                          onClick={() => handleInteraction(snap._id, "dislike")}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${hasDisliked ? 'bg-rose-100 text-rose-700' : 'bg-gray-50 text-gray-600 hover:bg-rose-50'}`}
                        >
                          <ThumbsDown className={`h-4 w-4 ${hasDisliked ? 'fill-rose-600' : ''}`} /> {snap.dislikes.length}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
