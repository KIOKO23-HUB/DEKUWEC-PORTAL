"use client";

import { useState, useEffect } from "react";
import { 
  Radio, 
  HelpCircle, 
  ThumbsUp, 
  XCircle, 
  Globe, 
  TrendingUp,
  ChevronRight,
  Info,
  Loader2
} from "lucide-react";

// Fallback Question
const DEFAULT_QUESTION = {
  _id: "default_q",
  text: "What is the primary reason flamingos have shifted their migration patterns away from Lake Nakuru in recent years?",
  options: [
    { id: "A", text: "Increased predator populations near the shores" },
    { id: "B", text: "Rising water levels diluting the lake's alkalinity and reducing algae" },
    { id: "C", text: "Extreme drought completely drying up the lake bed" },
    { id: "D", text: "Manual relocation by the Kenya Wildlife Service (KWS)" }
  ],
  correctAnswer: "B",
  explanation: "Rising water levels in the Rift Valley lakes have diluted the alkaline waters, significantly reducing the Spirulina algae that flamingos feed on."
};

export default function EcoPulseDispatchPage() {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);

  // Dynamic Content Lists
  const [activeQuiz, setActiveQuiz] = useState<any>(DEFAULT_QUESTION);
  const [environmentTopics, setEnvironmentTopics] = useState<any[]>([]);
  const [socioEconomicTopics, setSocioEconomicTopics] = useState<any[]>([]);

  useEffect(() => {
    async function loadEcoPulseData() {
      try {
        const res = await fetch("/api/ecopulse");
        const data = await res.json();
        
        if (data.posts && data.posts.length > 0) {
          // Extract latest Quiz
          const latestQuiz = data.posts.find((p: any) => p.type === "quiz");
          if (latestQuiz) {
            setActiveQuiz({
              _id: latestQuiz._id,
              text: latestQuiz.title,
              options: latestQuiz.options || DEFAULT_QUESTION.options,
              correctAnswer: latestQuiz.correctAnswer || "B",
              explanation: latestQuiz.content || DEFAULT_QUESTION.explanation
            });
          }

          // Extract Topic Articles
          const articles = data.posts.filter((p: any) => p.type === "topic");
          const env = articles.filter((a: any) => a.category !== "Socio-Economic");
          const socio = articles.filter((a: any) => a.category === "Socio-Economic");

          if (env.length > 0) setEnvironmentTopics(env);
          if (socio.length > 0) setSocioEconomicTopics(socio);
        }
      } catch (err) {
        console.error("Failed to load live EcoPulse data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadEcoPulseData();
  }, []);

  const handleOptionSelect = (optionId: string) => {
    if (!showResult) {
      setSelectedOption(optionId);
      setShowResult(true);
    }
  };

  const isCorrect = selectedOption === activeQuiz.correctAnswer;

  return (
    <div className="p-6 sm:p-8 lg:p-12 max-w-7xl mx-auto space-y-12">
      
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
            <Radio className="h-6 w-6" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-emerald-950 tracking-tight">EcoPulse Dispatch</h1>
        </div>
        <p className="text-sm sm:text-base text-gray-500 max-w-3xl leading-relaxed">
          The central hub for our weekly meeting discussion topics. Engage with the Question of the Week, and read up on the latest environmental and socio-economic news shaping our world.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* 1. Question of the Week */}
          <section className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-10 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <HelpCircle className="h-48 w-48 text-emerald-900" />
            </div>
            
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-6">
                <HelpCircle className="h-4 w-4" />
                <span>Question of the Week</span>
              </div>
              
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 leading-relaxed">
                {activeQuiz.text}
              </h2>

              <div className="space-y-3">
                {activeQuiz.options.map((option: any) => {
                  const isSelected = selectedOption === option.id;
                  const isActuallyCorrect = option.id === activeQuiz.correctAnswer;
                  
                  let buttonStyle = "bg-gray-50 border-gray-200 hover:border-emerald-400 hover:bg-emerald-50 text-gray-700";
                  
                  if (showResult) {
                    if (isActuallyCorrect) {
                      buttonStyle = "bg-emerald-100 border-emerald-500 text-emerald-900 font-bold";
                    } else if (isSelected && !isActuallyCorrect) {
                      buttonStyle = "bg-rose-50 border-rose-300 text-rose-700";
                    } else {
                      buttonStyle = "bg-gray-50 border-gray-200 text-gray-400 opacity-60";
                    }
                  }

                  return (
                    <button
                      key={option.id}
                      onClick={() => handleOptionSelect(option.id)}
                      disabled={showResult}
                      className={`w-full flex items-center p-4 border rounded-2xl text-left transition-all duration-300 ${buttonStyle}`}
                    >
                      <span className={`flex items-center justify-center h-8 w-8 rounded-full border text-sm font-bold mr-4 shrink-0 ${showResult && isActuallyCorrect ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-gray-300'}`}>
                        {option.id}
                      </span>
                      <span className="text-sm sm:text-base">{option.text}</span>
                    </button>
                  );
                })}
              </div>

              {showResult && (
                <div className={`mt-6 p-5 rounded-2xl flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 ${isCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-blue-50 border border-blue-200'}`}>
                  <div className="shrink-0 mt-0.5">
                    {isCorrect ? (
                      <ThumbsUp className="h-6 w-6 text-emerald-600" />
                    ) : (
                      <XCircle className="h-6 w-6 text-rose-500" />
                    )}
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold mb-1 ${isCorrect ? 'text-emerald-800' : 'text-rose-700'}`}>
                      {isCorrect ? "Correct! Well done! 👍" : `Incorrect! The answer is ${activeQuiz.correctAnswer}.`}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      <Info className="h-3.5 w-3.5 inline mr-1 text-gray-400" />
                      {activeQuiz.explanation}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 2. Wildlife & Environment Topics */}
          {environmentTopics.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-200 pb-2">
                <Globe className="h-6 w-6 text-emerald-600" />
                <h2 className="text-2xl font-black text-emerald-950">Environment & Wildlife</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                {environmentTopics.map((topic) => (
                  <div key={topic._id} className="group bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer flex flex-col">
                    {topic.imageUrl && (
                      <div className="h-48 w-full overflow-hidden bg-gray-100 flex items-center justify-center p-2">
                        {/* Adjusted to object-contain to match admin panel upload scale */}
                        <img src={topic.imageUrl} alt={topic.title} className="w-full h-full object-contain group-hover:scale-105 transition duration-700" />
                      </div>
                    )}
                    <div className="p-6 sm:p-8 flex flex-col flex-grow">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
                          {topic.category || "Conservation"}
                        </span>
                        <span className="text-xs text-gray-400 font-medium">{topic.date}</span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-emerald-700 transition">
                        {topic.title}
                      </h3>
                      <p className="text-sm text-gray-500 leading-relaxed mb-6 flex-grow whitespace-pre-wrap">
                        {topic.content}
                      </p>
                      {topic.link && (
                        <a href={topic.link} target="_blank" rel="noreferrer" className="flex items-center text-xs font-bold text-emerald-600">
                          Read Full Article <ChevronRight className="h-4 w-4 ml-1" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 3. Socio-Economic & Current Affairs */}
          {socioEconomicTopics.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-200 pb-2">
                <TrendingUp className="h-6 w-6 text-blue-600" />
                <h2 className="text-2xl font-black text-slate-900">Socio-Economic & Current Affairs</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                {socioEconomicTopics.map((topic) => (
                  <div key={topic._id} className="group bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer flex flex-col">
                    {topic.imageUrl && (
                      <div className="h-48 w-full overflow-hidden bg-gray-100 flex items-center justify-center p-2">
                        {/* Adjusted to object-contain to match admin panel upload scale */}
                        <img src={topic.imageUrl} alt={topic.title} className="w-full h-full object-contain group-hover:scale-105 transition duration-700" />
                      </div>
                    )}
                    <div className="p-6 sm:p-8 flex flex-col flex-grow">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                          {topic.category || "Socio-Economic"}
                        </span>
                        <span className="text-xs text-gray-400 font-medium">{topic.date}</span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-700 transition">
                        {topic.title}
                      </h3>
                      <p className="text-sm text-gray-500 leading-relaxed mb-6 flex-grow whitespace-pre-wrap">
                        {topic.content}
                      </p>
                      {topic.link && (
                        <a href={topic.link} target="_blank" rel="noreferrer" className="flex items-center text-xs font-bold text-blue-600">
                          View Discussion Points <ChevronRight className="h-4 w-4 ml-1" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
