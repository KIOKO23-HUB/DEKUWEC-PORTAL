"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { 
  TreePine, 
  Compass, 
  Users, 
  Award, 
  Mail, 
  Phone, 
  MapPin, 
  MessageSquare, 
  Send, 
  CheckCircle, 
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Loader2,
  Sparkles,
  Globe
} from "lucide-react";

export default function Home() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<"home" | "about" | "contact">("home");

  // Contact form state
  const [formState, setFormState] = useState({
    fullName: user?.fullName || "",
    email: user?.primaryEmailAddress?.emailAddress || "",
    subject: "",
    message: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.fullName || !formState.email || !formState.message) {
      return alert("Please fill in all required fields.");
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formState,
          clerkId: user?.id || "guest"
        })
      });
      if (res.ok) {
        setSentSuccess(true);
        setFormState({ fullName: "", email: "", subject: "", message: "" });
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || "Failed to deliver your message. Please reach out via WhatsApp directly.");
      }
    } catch {
      alert("Network error. Please try connecting via our WhatsApp community.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 via-teal-50/60 to-green-100 text-gray-900 font-sans selection:bg-emerald-600 selection:text-white">
      
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 border-b border-emerald-100 shadow-sm transition">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex justify-between items-center">
          
          {/* Logo Brand */}
          <div 
            onClick={() => setActiveTab("home")} 
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 relative rounded-full border-2 border-emerald-600 overflow-hidden shadow-sm shrink-0 bg-white">
              <img 
                src="https://res.cloudinary.com/dnipaby6h/image/upload/v1789108366/WhatsApp_Image_2026-09-03_at_09.49.04_q31jcg.jpg" 
                alt="DEKUWEC Logo" 
                className="w-full h-full object-cover group-hover:scale-105 transition"
              />
            </div>
            <div>
              <span className="text-base sm:text-lg font-black tracking-tight text-emerald-950 block leading-tight">
                DEKUWEC
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-emerald-700 block">
                DeKUT Conservation
              </span>
            </div>
          </div>

          {/* Interactive Header Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-2 bg-emerald-950/5 p-1 rounded-2xl border border-emerald-200/40 text-xs sm:text-sm font-bold">
            <button
              onClick={() => setActiveTab("home")}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl transition ${
                activeTab === "home"
                  ? "bg-emerald-800 text-white shadow-sm"
                  : "text-emerald-900 hover:text-emerald-700"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("about")}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl transition ${
                activeTab === "about"
                  ? "bg-emerald-800 text-white shadow-sm"
                  : "text-emerald-900 hover:text-emerald-700"
              }`}
            >
              Impact
            </button>
            <button
              onClick={() => setActiveTab("contact")}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl transition ${
                activeTab === "contact"
                  ? "bg-emerald-800 text-white shadow-sm"
                  : "text-emerald-900 hover:text-emerald-700"
              }`}
            >
              Contact
            </button>
          </nav>

          {/* Auth Button */}
          <div className="flex items-center space-x-2">
            {user ? (
              <Link 
                href="/dashboard" 
                className="px-4 sm:px-5 py-2 sm:py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-bold rounded-xl transition shadow-md flex items-center gap-1.5"
              >
                <span>Dashboard</span>
                <ChevronRight className="h-4 w-4 hidden sm:inline" />
              </Link>
            ) : (
              <div className="flex items-center space-x-2">
                <Link 
                  href="/login" 
                  className="px-3 sm:px-4 py-2 text-emerald-950 text-xs sm:text-sm font-bold hover:text-emerald-700 transition"
                >
                  Sign In
                </Link>
                <Link 
                  href="/signup" 
                  className="px-3.5 sm:px-5 py-2 sm:py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-bold rounded-xl transition shadow-sm"
                >
                  Join Us
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Tab Content */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col justify-center">

        {/* TAB 1: OVERVIEW / HERO */}
        {activeTab === "home" && (
          <div className="space-y-12 animate-in fade-in duration-300">
            <div className="flex flex-col items-center text-center max-w-3xl mx-auto space-y-6 pt-4 sm:pt-8">
              
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-300 text-emerald-900 text-xs font-bold uppercase tracking-wider shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
                <span>Premier Student Conservation Body</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-emerald-950 leading-tight">
                Dedan Kimathi Wildlife & Environmental Club
              </h1>

              <p className="text-sm sm:text-lg text-emerald-900/80 leading-relaxed font-medium max-w-2xl">
                Dedicated to hands-on environmental conservation, mountain trail explorations, and sustainable biodiversity protection at Dedan Kimathi University of Technology.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto justify-center pt-2">
                {user ? (
                  <Link 
                    href="/dashboard" 
                    className="px-8 py-3.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-lg transition text-center"
                  >
                    Open DEKUWEC Dashboard
                  </Link>
                ) : (
                  <>
                    <Link 
                      href="/signup" 
                      className="px-8 py-3.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-lg transition text-center"
                    >
                      Open DEKUWEC Dashboard
                    </Link>
                    <button 
                      onClick={() => setActiveTab("contact")} 
                      className="px-8 py-3.5 bg-white/80 hover:bg-white text-emerald-950 font-bold rounded-xl shadow-sm border border-emerald-200 transition text-center"
                    >
                      Reach Out / Support
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Feature Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
              <div className="bg-white/80 backdrop-blur-sm border border-emerald-100 p-6 rounded-3xl shadow-sm space-y-3">
                <div className="p-3 bg-emerald-100 text-emerald-800 rounded-2xl w-max">
                  <TreePine className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-lg text-emerald-950">Active Reforestation</h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  Cultivating indigenous seedling nurseries and conducting tree planting initiatives across DeKUT and Nyeri highlands.
                </p>
              </div>

              <div className="bg-white/80 backdrop-blur-sm border border-emerald-100 p-6 rounded-3xl shadow-sm space-y-3">
                <div className="p-3 bg-teal-100 text-teal-800 rounded-2xl w-max">
                  <Compass className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-lg text-emerald-950">Expeditions & Treks</h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  Regular member excursions to Mount Kenya, Aberdare National Park, Percival Falls, and Ol Donyo Satima via Dragon's Teeth.
                </p>
              </div>

              <div className="bg-white/80 backdrop-blur-sm border border-emerald-100 p-6 rounded-3xl shadow-sm space-y-3">
                <div className="p-3 bg-emerald-100 text-emerald-800 rounded-2xl w-max">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-lg text-emerald-950">Community & Action</h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  Weekly physical meetings every Wednesday (5:00 PM – 6:45 PM), community outreach, EcoPulse debates, and environmental advocacy.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ACHIEVEMENTS & WHAT WE DO */}
        {activeTab === "about" && (
          <div className="space-y-10 animate-in fade-in duration-300 py-4">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h2 className="text-3xl sm:text-4xl font-black text-emerald-950">What We Do & Milestones</h2>
              <p className="text-sm text-emerald-800/80 font-medium">
                Our record of environmental impact, conservation fieldwork, and student empowerment.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-emerald-100 shadow-sm space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                    <Award className="h-4 w-4" /> Major Achievement
                  </div>
                  <h3 className="text-xl font-black text-gray-900">Campus Tree Nursery Project</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Successfully established an indigenous tree nursery at Dedan Kimathi University of Technology, raising thousands of seedlings used to reclaim degraded riparian habitats and community forest margins.
                  </p>
                </div>
                <div className="pt-2 flex items-center gap-2 text-xs font-bold text-emerald-700">
                  <CheckCircle className="h-4 w-4" /> Over 10,000 Seedlings Raised
                </div>
              </div>

              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-emerald-100 shadow-sm space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-bold">
                    <Compass className="h-4 w-4" /> Park Explorations
                  </div>
                  <h3 className="text-xl font-black text-gray-900">Aberdares & Mt. Kenya Expeditions</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Organized landmark excursions across the Aberdare Ranges (Karuru Falls, Magura Falls, Queen's Falls) and Mount Kenya National Park, enabling students to gain hands-on ecological education.
                  </p>
                </div>
                <div className="pt-2 flex items-center gap-2 text-xs font-bold text-teal-700">
                  <CheckCircle className="h-4 w-4" /> High-Altitude Moorland Treks
                </div>
              </div>

              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-emerald-100 shadow-sm space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                    <Users className="h-4 w-4" /> Community Care
                  </div>
                  <h3 className="text-xl font-black text-gray-900">Baraka Children's Home Outreach</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Active social-environmental mentorship drives where club members donate essentials, conduct environmental hygiene sessions, and mentor children on natural habitat preservation.
                  </p>
                </div>
                <div className="pt-2 flex items-center gap-2 text-xs font-bold text-emerald-700">
                  <CheckCircle className="h-4 w-4" /> Community Mentorship Drives
                </div>
              </div>

              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-emerald-100 shadow-sm space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                    <ShieldCheck className="h-4 w-4" /> Heritage Partnership
                  </div>
                  <h3 className="text-xl font-black text-gray-900">Dedan Kimathi Memorial Collaboration</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Collaborated with the Dedan Kimathi Foundation at Kahiga-ini Memorial Park in Ihururu to honor Field Marshal Dedan Kimathi Wachiuri through conservation and commemorative indigenous tree plantings.
                  </p>
                </div>
                <div className="pt-2 flex items-center gap-2 text-xs font-bold text-amber-800">
                  <CheckCircle className="h-4 w-4" /> Heritage & Environmental Action
                </div>
              </div>

            </div>

            <div className="p-6 sm:p-8 bg-emerald-900 text-white rounded-3xl text-center space-y-3 shadow-lg">
              <h3 className="text-xl sm:text-2xl font-bold text-emerald-200">Want to Join Our Next Project?</h3>
              <p className="text-sm text-emerald-100 max-w-xl mx-auto">
                Join our student membership roster today and gain access to Wildlife Clubs of Kenya (WCK) subsidized national park passes.
              </p>
              <div className="pt-2">
                <Link href="/signup" className="px-6 py-3 bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-black rounded-xl inline-block text-xs uppercase tracking-wider transition shadow">
                  Open DEKUWEC Dashboard
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CONTACT & SUPPORT */}
        {activeTab === "contact" && (
          <div className="space-y-10 animate-in fade-in duration-300 py-4">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h2 className="text-3xl sm:text-4xl font-black text-emerald-950">Contact & Support</h2>
              <p className="text-sm text-emerald-800/80 font-medium">
                Connect with our team, join the official community, or send a direct inquiry.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: WhatsApp, Location, and Handles */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* WhatsApp Community Box */}
                <div className="bg-emerald-900 text-white p-6 sm:p-8 rounded-3xl shadow-md space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-700/60 rounded-2xl text-emerald-300">
                      <MessageSquare className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Join Our WhatsApp</h3>
                      <p className="text-xs text-emerald-300">Official Student Community</p>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
                    Get announcements for Wednesday meetings, hiking slot registrations, tree nursery sessions, and merchandise releases.
                  </p>
                  <a
                    href="https://chat.whatsapp.com/BVJYVdzZTa97xHKaxFhxqu"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3.5 bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-black rounded-xl text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition shadow"
                  >
                    <span>Open WhatsApp Group</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>

                {/* Direct Information */}
                <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm space-y-4 text-sm">
                  <h4 className="font-black text-gray-900 text-base border-b border-gray-100 pb-3">Meeting & Contact Info</h4>
                  
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-gray-900">Physical Base</p>
                      <p className="text-xs text-gray-600">Dedan Kimathi University of Technology, Nyeri, Kenya</p>
                      <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">Wednesdays 5:00 PM – 6:45 PM</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-gray-900">Official Email</p>
                      <a href="mailto:dekuwec@gmail.com" className="text-xs text-emerald-700 hover:underline">
                        dekuwec@gmail.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-gray-900">Executive Hotline</p>
                      <p className="text-xs text-gray-600">+254 758 638 953</p>
                    </div>
                  </div>
                </div>

                {/* Social Media Icons with Pure SVG Icons */}
                <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm space-y-3">
                  <h4 className="font-black text-gray-900 text-sm">Follow Us Online</h4>
                  <div className="flex items-center gap-3 pt-1">
                    
                    {/* Instagram */}
                    <a 
                      href="https://instagram.com" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-2xl transition" 
                      title="Instagram"
                    >
                      <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    </a>

                    {/* X / Twitter */}
                    <a 
                      href="https://twitter.com" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-2xl transition" 
                      title="X (Twitter)"
                    >
                      <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                    </a>

                    {/* LinkedIn */}
                    <a 
                      href="https://linkedin.com" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-2xl transition" 
                      title="LinkedIn"
                    >
                      <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                      </svg>
                    </a>

                    {/* Facebook */}
                    <a 
                      href="https://facebook.com" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-2xl transition" 
                      title="Facebook"
                    >
                      <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                        <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"/>
                      </svg>
                    </a>

                    {/* Website */}
                    <a 
                      href="https://dekuwec.app" 
                      className="p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-2xl transition" 
                      title="Portal"
                    >
                      <Globe className="h-5 w-5" />
                    </a>
                  </div>
                </div>

              </div>

              {/* Right Column: Direct Message Form */}
              <div className="lg:col-span-7">
                <div className="bg-white p-6 sm:p-10 rounded-3xl border border-emerald-100 shadow-sm space-y-6">
                  
                  <div>
                    <h3 className="text-2xl font-black text-emerald-950">Send a Message</h3>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      Have questions regarding club membership, upcoming excursions, or WCK affiliate passes? Leave a message below.
                    </p>
                  </div>

                  {sentSuccess ? (
                    <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3 animate-in zoom-in-95 duration-200">
                      <CheckCircle className="h-10 w-10 text-emerald-600 mx-auto" />
                      <h4 className="font-bold text-emerald-950 text-lg">Message Delivered!</h4>
                      <p className="text-xs text-emerald-800 leading-relaxed">
                        Thank you for contacting DEKUWEC. Our executive team has received your note and will reply directly to your student email.
                      </p>
                      <button
                        onClick={() => setSentSuccess(false)}
                        className="px-5 py-2 bg-emerald-700 text-white text-xs font-bold rounded-xl hover:bg-emerald-800 transition"
                      >
                        Send Another Note
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSendMessage} className="space-y-4">
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Full Name</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Kelvin Maina"
                            value={formState.fullName}
                            onChange={(e) => setFormState({ ...formState, fullName: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-emerald-600 outline-none transition bg-gray-50 focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Student Email Address</label>
                          <input
                            type="email"
                            required
                            placeholder="student@dkut.ac.ke"
                            value={formState.email}
                            onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-emerald-600 outline-none transition bg-gray-50 focus:bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Inquiry Subject</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. WCK Affiliate Card / Hike Registration slot"
                          value={formState.subject}
                          onChange={(e) => setFormState({ ...formState, subject: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-emerald-600 outline-none transition bg-gray-50 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Your Message</label>
                        <textarea
                          rows={5}
                          required
                          placeholder="Type your message or inquiry for the club leadership..."
                          value={formState.message}
                          onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-emerald-600 outline-none transition bg-gray-50 focus:bg-white"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-4 bg-emerald-800 hover:bg-emerald-900 disabled:bg-emerald-400 text-white font-bold rounded-xl text-sm transition shadow-md flex items-center justify-center gap-2"
                      >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        <span>{submitting ? "Sending..." : "Submit Inquiry to Executives"}</span>
                      </button>
                    </form>
                  )}

                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* Footer */}
      <footer className="w-full border-t border-emerald-200/60 bg-white/60 backdrop-blur-sm py-6 text-center text-xs text-emerald-800/80 font-medium">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>Dedan Kimathi University of Technology &copy; 2026 DEKUWEC. All Rights Reserved.</p>
          <div className="flex items-center gap-4 text-emerald-900 font-bold">
            <button onClick={() => setActiveTab("home")} className="hover:underline">Overview</button>
            <span>•</span>
            <button onClick={() => setActiveTab("about")} className="hover:underline">Impact</button>
            <span>•</span>
            <button onClick={() => setActiveTab("contact")} className="hover:underline">Contact & Support</button>
          </div>
        </div>
      </footer>
    </main>
  );
}