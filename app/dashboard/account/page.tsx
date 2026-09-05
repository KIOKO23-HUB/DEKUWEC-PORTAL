"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { UploadCloud, Mail, BookOpen, GraduationCap, Loader2, Save } from "lucide-react";

export default function SimplifiedAccountPage() {
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  const [member, setMember] = useState({
    email: "",
    course: "",
    year: "Year 1",
    photoURL: ""
  });

  useEffect(() => {
    if (!isLoaded || !user) return;
    
    const loadProfile = async () => {
      try {
        const res = await fetch("/api/member");
        const data = await res.json();
        if (data.member) {
          setMember({
            email: data.member.email || user.primaryEmailAddress?.emailAddress || "",
            course: data.member.course || "",
            year: data.member.year || "Year 1",
            photoURL: data.member.photoURL || ""
          });
        }
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
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
        body: JSON.stringify({
          course: member.course,
          year: member.year,
        }),
      });
      alert("Profile updated successfully!");
    } catch (err) {
      console.error("Save failed", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !isLoaded) return <div className="p-10 text-emerald-800 font-bold">Loading Account...</div>;

  // Prioritize live Clerk Image over the database one so it always stays in sync
  const displayImage = user?.imageUrl || member.photoURL;

  return (
    <div className="p-8 lg:p-12 max-w-2xl mx-auto">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
        <h1 className="text-2xl font-black text-emerald-950 mb-6">Account Details</h1>
        
        {/* Image Upload */}
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
        </div>

        {/* Data Form */}
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">User Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
              <input 
                type="email" 
                disabled 
                value={member.email} 
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 cursor-not-allowed text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">Academic Course</label>
            <div className="relative">
              <BookOpen className="absolute left-3.5 top-3 h-4 w-4 text-emerald-600" />
              <input 
                type="text" 
                required 
                value={member.course} 
                onChange={(e) => setMember({...member, course: e.target.value})}
                placeholder="e.g. Mechanical Engineering"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-900 text-sm focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">Year of Study</label>
            <div className="relative">
              <GraduationCap className="absolute left-3.5 top-3 h-4 w-4 text-emerald-600" />
              <select 
                value={member.year} 
                onChange={(e) => setMember({...member, year: e.target.value})}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-900 text-sm focus:border-emerald-500 outline-none appearance-none"
              >
                <option value="Year 1">Year 1</option>
                <option value="Year 2">Year 2</option>
                <option value="Year 3">Year 3</option>
                <option value="Year 4">Year 4</option>
                <option value="Year 5">Year 5</option>
              </select>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={saving}
            className="w-full mt-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>Save Account Information</span>
          </button>
        </form>
      </div>
    </div>
  );
}
