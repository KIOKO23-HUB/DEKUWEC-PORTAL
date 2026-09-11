"use client";

import { useEffect, useState, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { UploadCloud, Mail, BookOpen, GraduationCap, Loader2, Save, Calendar, Camera, CreditCard, Award, CheckCircle } from "lucide-react";

export default function ComprehensiveAccountPage() {
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  const [member, setMember] = useState({ email: "", course: "", year: "Year 1", photoURL: "", status: "Unregistered" });
  
  // FIX 1: Added <any> here to stop Vercel from crashing with a 'never' type error
  const [activityData, setActivityData] = useState<any>({ rsvps: [], wck: null, snaps: [] });

  useEffect(() => {
    if (!isLoaded || !user) return;
    
    const loadProfileData = async () => {
      try {
        const [profileRes, activityRes] = await Promise.all([
          fetch("/api/member"),
          fetch(`/api/account/activity?clerkId=${user.id}`)
        ]);
        
        const profileData = await profileRes.json();
        const actData = await activityRes.json();

        if (profileData.member) {
          setMember({
            email: profileData.member.email || user.primaryEmailAddress?.emailAddress || "",
            course: profileData.member.course || "",
            year: profileData.member.year || "Year 1",
            photoURL: profileData.member.photoURL || "",
            status: actData.memberStatus?.status || "Unregistered"
          });
        }
        
        setActivityData({
          rsvps: actData.rsvps || [],
          wck: actData.wck || null,
          snaps: actData.snaps || []
        });

      } catch (err) {
        console.error("Failed to load account data", err);
      } finally {
        setLoading(false);
      }
    };
    loadProfileData();
  }, [isLoaded, user]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingPhoto(true);
    try {
      await user.setProfileImage({ file });
      setMember((prev) => ({ ...prev, photoURL: user.imageUrl }));
    } catch (err) {
      console.error("Photo upload failed", err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course: member.course, year: member.year }),
      });
      alert("Profile updated successfully!");
    } catch (err) {
      console.error("Save failed", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !isLoaded) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  const displayImage = user?.imageUrl || member.photoURL;

  return (
    <div className="p-6 sm:p-8 lg:p-12 max-w-6xl mx-auto space-y-8">
      
      <div className="flex flex-col md:flex-row gap-6 items-start">
        
        {/* LEFT COLUMN: Profile Editor */}
        <div className="w-full md:w-1/3 bg-white rounded-3xl shadow-sm border border-gray-100 p-8 shrink-0">
          <div className="text-center mb-6">
            <h2 className="text-xl font-black text-emerald-950">My Profile</h2>
            <span className={`inline-block mt-2 text-xs font-bold px-3 py-1 rounded-full ${member.status === "Registered Member" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700"}`}>
              {member.status}
            </span>
          </div>
          
          <div className="flex flex-col items-center mb-8 pb-8 border-b border-gray-100">
            <div className="relative group w-28 h-28">
              <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 border-4 border-emerald-100">
                {displayImage ? (
                  <img src={displayImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-emerald-50 text-emerald-800 font-bold text-2xl">
                    {member.email ? member.email.charAt(0).toUpperCase() : "U"}
                  </div>
                )}
              </div>
              <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center cursor-pointer rounded-full text-white text-xs font-bold">
                <UploadCloud className="h-5 w-5 mb-1" />
                {uploadingPhoto ? "Uploading..." : "Change"}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>
            <h3 className="mt-4 font-bold text-gray-900">{user?.fullName}</h3>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">User Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                <input type="email" disabled value={member.email} className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 cursor-not-allowed text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">Academic Course</label>
              <div className="relative">
                <BookOpen className="absolute left-3.5 top-3 h-4 w-4 text-emerald-600" />
                <input type="text" required value={member.course} onChange={(e) => setMember({...member, course: e.target.value})} placeholder="e.g. Mechanical Engineering" className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-900 text-sm focus:border-emerald-500 outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">Year of Study</label>
              <div className="relative">
                <GraduationCap className="absolute left-3.5 top-3 h-4 w-4 text-emerald-600" />
                <select value={member.year} onChange={(e) => setMember({...member, year: e.target.value})} className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-900 text-sm focus:border-emerald-500 outline-none appearance-none">
                  <option value="Year 1">Year 1</option><option value="Year 2">Year 2</option><option value="Year 3">Year 3</option><option value="Year 4">Year 4</option><option value="Year 5">Year 5</option>
                </select>
              </div>
            </div>
            <button type="submit" disabled={saving} className="w-full mt-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition flex items-center justify-center gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>Save Details</span>
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: Activity Dashboard */}
        <div className="w-full md:w-2/3 space-y-6">
          
          <div className="bg-emerald-950 rounded-3xl p-6 sm:p-8 text-white shadow-sm">
            <h2 className="text-2xl font-black mb-1">Your DEKUWEC Journey</h2>
            <p className="text-sm text-emerald-300">Track your event RSVPs, WCK status, and photo contributions.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Event RSVPs */}
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-emerald-950 flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-emerald-600" /> Event RSVPs
              </h3>
              {activityData.rsvps.length === 0 ? (
                <p className="text-sm text-gray-400">You haven't registered for any events yet.</p>
              ) : (
                <ul className="space-y-3">
                  {activityData.rsvps.map((rsvp: any) => (
                    <li key={rsvp._id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-gray-900 leading-tight">{rsvp.eventName}</p>
                        <p className="text-xs text-gray-500 mt-1">{new Date(rsvp.createdAt).toLocaleDateString()}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* WCK Card Status */}
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-emerald-950 flex items-center gap-2 mb-4">
                <CreditCard className="h-5 w-5 text-emerald-600" /> WCK Card
              </h3>
              {activityData.wck ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <p className="text-sm font-bold text-emerald-900 mb-1">Application Submitted</p>
                  
                  {/* FIX 2: Safely parse the date with optional chaining */}
                  <p className="text-xs text-emerald-700">Applied on: {activityData.wck?.createdAt ? new Date(activityData.wck.createdAt).toLocaleDateString() : "Recently"}</p>
                  
                  <span className="inline-block mt-3 bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide">Processing</span>
                </div>
              ) : (
                <p className="text-sm text-gray-400">You haven't applied for a WCK Card.</p>
              )}
            </div>

            {/* Nature Snaps */}
            <div className="sm:col-span-2 bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-emerald-950 flex items-center gap-2 mb-4">
                <Camera className="h-5 w-5 text-emerald-600" /> Nature Snaps Portfolio
              </h3>
              {activityData.snaps.length === 0 ? (
                <p className="text-sm text-gray-400">You haven't uploaded any photos to the weekly challenge.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {activityData.snaps.map((snap: any) => (
                    <div key={snap._id} className="relative aspect-square rounded-xl overflow-hidden group border border-gray-200 shadow-sm">
                      <img src={snap.imageUrl} alt="My Snap" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2 opacity-0 group-hover:opacity-100 transition">
                        <p className="text-white text-[10px] font-bold line-clamp-1">{snap.caption}</p>
                        <p className="text-emerald-300 text-[10px] flex items-center gap-1 mt-0.5"><Award className="h-3 w-3" /> {snap.likes?.length || 0} Likes</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
