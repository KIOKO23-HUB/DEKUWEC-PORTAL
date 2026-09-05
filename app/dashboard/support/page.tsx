"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { 
  Clock, 
  MapPin, 
  Mail, 
  Send, 
  User, 
  Phone,
  HelpCircle,
  CheckCircle2,
  Loader2
} from "lucide-react";

// Mock Data for Executive Board (To be managed via Admin Page later)
const executiveBoard = [
  { id: 1, name: "Curtis Kioko", role: "Chairperson", phone: "0758638953", image: null },
  { id: 2, name: "Grace Chebet", role: "Vice Chairperson", phone: "+254 7XX XXX XXX", image: null },
  { id: 3, name: "Elizabeth Mwelu", role: "Club Secretary", phone: "+254 7XX XXX XXX", image: null },
  { id: 4, name: "Joseph Mwendia", role: "Organising Secretary", phone: "+254 7XX XXX XXX", image: null },
  { id: 5, name: "Melody Mbonne", role: "Public Representative (PR)", phone: "+254 7XX XXX XXX", image: null },
  { id: 6, name: "Hannah Macharia", role: "Treasurer", phone: "+254 7XX XXX XXX", image: null },
  { id: 7, name: "Zac", role: "Information Director", phone: "+254 7XX XXX XXX", image: null },
  { id: 8, name: "Philip Theuri", role: "Assistant Leader", phone: "+254 7XX XXX XXX", image: null },
  { id: 9, name: "Elias Tirop", role: "Assistant Leader", phone: "+254 7XX XXX XXX", image: null },
  { id: 10, name: "Amos", role: "Assistant Leader", phone: "+254 7XX XXX XXX", image: null },
];

export default function SupportPage() {
  const { user, isLoaded } = useUser(); // Added isLoaded here
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ 
    name: "", 
    email: "", 
    subject: "", 
    message: "" 
  });

  // Pre-fill user data once loaded
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: user.fullName || "",
        email: user.primaryEmailAddress?.emailAddress || "",
      }));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: user?.id || "anonymous",
          fullName: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        setFormData({ ...formData, subject: "", message: "" }); // Reset subject/message but keep name/email
        setTimeout(() => {
          setSubmitted(false);
        }, 4000);
      } else {
        alert("Failed to send message. Please try again.");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred while sending the message.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Prevent rendering until Clerk has loaded the user data so the form pre-fills correctly
  if (!isLoaded) return null;

  return (
    <div className="p-6 sm:p-8 lg:p-12 max-w-7xl mx-auto space-y-10">
      
      {/* Header */}
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl sm:text-4xl font-black text-emerald-950 tracking-tight">Help & Inquiries</h1>
        <p className="text-sm sm:text-base text-gray-500 mt-2">Dedan Kimathi University of Technology</p>
      </div>

      {/* Top Section: Info & Contact Form */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* Left Column: Meeting Info & Direct Channels */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Meeting Hours Card */}
          <div className="bg-emerald-900 text-white rounded-3xl p-8 shadow-md h-auto">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-6 w-6 text-emerald-400" />
              <h2 className="text-xl font-bold">Weekly Meeting Hours</h2>
            </div>
            <p className="text-sm text-emerald-100 leading-relaxed mb-8">
              Join our regular physical sessions where we review weekly nature snaps, conduct debates, and confirm logistics for upcoming weekend hikes.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-sm font-medium leading-snug">
                  Dedan Kimathi University of Technology, <br />
                  Main Campus, School of Business ROOM N.o 5
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-emerald-400 shrink-0" />
                <span className="text-sm font-medium">Every Wednesday from 5:00 PM – 6:45 PM</span>
              </div>
            </div>
          </div>

          {/* Direct Channels Card */}
          <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-5">Direct Channels</h3>
            
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl shrink-0">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Official Email</p>
                  <a href="mailto:wildlifeandenvironmentalclub@dkut.ac.ke" className="text-sm font-semibold text-emerald-700 hover:underline break-all">
                    wildlifeandenvironmentalclub@dkut.ac.ke
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl shrink-0">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Club Secretariat</p>
                  <p className="text-sm font-semibold text-gray-800">
                    Club Secretary - Elizabeth Mwelu
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Contact Form */}
        <div className="lg:col-span-3 bg-white border border-gray-200 rounded-3xl p-8 sm:p-10 shadow-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-black text-emerald-950 mb-2">Send Us a Direct Note</h2>
            <p className="text-sm text-gray-500">Our executive board will review and reply to your student email.</p>
          </div>

          {submitted ? (
            <div className="h-64 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in duration-500">
              <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-emerald-950">Message Sent Successfully!</h3>
                <p className="text-sm text-gray-500 mt-1">We will get back to you shortly.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Your Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Victor Mutua"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-emerald-600 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. name@students.dkut.ac.ke"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-emerald-600 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Subject / Topic</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Inquiry about upcoming hike gear"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-emerald-600 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Message Details *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Type your question, suggestion, or partnership request..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-emerald-600 outline-none transition resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-md"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span>{isSubmitting ? "Sending Message..." : "Send Message"}</span>
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="w-full h-px bg-gray-200 my-4"></div>

      {/* DEKUWEC Executive Board Section */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-emerald-950">DEKUWEC Executive Board</h2>
          <p className="text-sm text-gray-500 mt-1">Contact our club leadership directly for official matters.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {executiveBoard.map((leader) => {
            const initials = leader.name.split(" ").map((n) => n[0]).join("");
            return (
              <div key={leader.id} className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col items-center text-center shadow-sm hover:border-emerald-300 transition">
                <div className="h-20 w-20 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-black mb-4 border-4 border-emerald-50">
                  {leader.image ? (
                    <img src={leader.image} alt={leader.name} className="h-full w-full rounded-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <h3 className="text-base font-bold text-gray-900 leading-tight mb-1">{leader.name}</h3>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3">{leader.role}</p>
                <a 
                  href={`tel:${leader.phone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-700 transition"
                >
                  <Phone className="h-3.5 w-3.5 text-emerald-600" />
                  {leader.phone}
                </a>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}
