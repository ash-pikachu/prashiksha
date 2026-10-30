import { useState, useEffect } from "react";
import { Eye, EyeOff, ArrowRight, Lock, Mail, GraduationCap, BookOpen, Star, Zap } from "lucide-react";

// Floating decorative elements for the left panel
const FLOATERS = [
  { icon: "book", x: 12, y: 18, size: 44, delay: "0s", dur: "4s" },
  { icon: "cap",  x: 72, y: 10, size: 38, delay: "0.8s", dur: "5s" },
  { icon: "star", x: 82, y: 58, size: 28, delay: "1.4s", dur: "3.5s" },
  { icon: "zap",  x: 8,  y: 65, size: 30, delay: "0.4s", dur: "4.5s" },
  { icon: "star", x: 48, y: 82, size: 20, delay: "2s",   dur: "6s" },
  { icon: "book", x: 60, y: 70, size: 32, delay: "1s",   dur: "4.2s" },
];

const FEATURES = [
  { icon: "🎯", text: "Personalized learning paths" },
  { icon: "📚", text: "Curated study materials" },
  { icon: "🧠", text: "Practice tests & mock exams" },
  { icon: "📈", text: "Track your progress daily" },
];

const QUOTES = [
  { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
  { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
  { text: "The more that you read, the more things you will know.", author: "Dr. Seuss" },
  { text: "Education is not the filling of a pail, but the lighting of a fire.", author: "W.B. Yeats" },
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
];

function LeftPanel({ quoteIndex, fadeIn }: { quoteIndex: number; fadeIn: boolean }) {
  const q = QUOTES[quoteIndex];
  return (
    <div className="relative flex flex-col justify-between h-full px-12 py-14 overflow-hidden select-none" style={{ minHeight: 560 }}>
      <style>{`
        @keyframes floatY {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50%       { transform: translateY(-14px) rotate(6deg); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes fadeSlideLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes quoteFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes quoteFadeOut {
          from { opacity: 1; transform: translateY(0); }
          to   { opacity: 0; transform: translateY(-10px); }
        }
        .floater { animation: floatY var(--dur) var(--delay) ease-in-out infinite; }
        .gradient-text {
          background: linear-gradient(90deg, #ffffff 0%, #c4b5fd 50%, #fbcfe8 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 5s linear infinite;
        }
        .fade-left { animation: fadeSlideLeft 0.7s cubic-bezier(0.22,1,0.36,1) both; }
        .quote-in  { animation: quoteFadeIn  0.55s cubic-bezier(0.22,1,0.36,1) both; }
        .quote-out { animation: quoteFadeOut 0.4s ease-in both; }
      `}</style>

      {/* Floating icons */}
      {FLOATERS.map((f, i) => (
        <div
          key={i}
          className="floater absolute pointer-events-none opacity-20"
          style={{ left: `${f.x}%`, top: `${f.y}%`, "--dur": f.dur, "--delay": f.delay } as React.CSSProperties}
        >
          {f.icon === "book" && <BookOpen size={f.size} color="white" />}
          {f.icon === "cap"  && <GraduationCap size={f.size} color="white" />}
          {f.icon === "star" && <Star size={f.size} color="white" fill="white" />}
          {f.icon === "zap"  && <Zap size={f.size} color="white" fill="white" />}
        </div>
      ))}

      {/* Brand */}
      <div className="fade-left relative z-10">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}>
            <GraduationCap size={18} color="white" />
          </div>
          <span className="text-white text-sm font-semibold tracking-widest uppercase opacity-80">Prashiksha</span>
        </div>

        <h1
          className="gradient-text font-bold leading-none mb-4"
          style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2.6rem, 5vw, 3.6rem)" }}
        >
          Prashiksha
        </h1>
        <p className="text-white/70 text-base leading-relaxed max-w-xs" style={{ fontFamily: "'Outfit', sans-serif" }}>
          Your gateway to academic excellence — from high school to college and beyond.
        </p>
      </div>

      {/* Divider line */}
      <div className="relative z-10 w-16 h-px my-6" style={{ background: "rgba(255,255,255,0.25)" }} />

      {/* Features */}
      <div className="relative z-10 flex flex-col gap-2.5 fade-left" style={{ animationDelay: "0.2s" }}>
        {FEATURES.map(({ icon, text }) => (
          <div key={text} className="flex items-center gap-3">
            <span className="text-base leading-none">{icon}</span>
            <span className="text-white/75 text-sm">{text}</span>
          </div>
        ))}
      </div>

      {/* Rotating quote */}
      <div
        className="relative z-10 mt-10 rounded-2xl px-5 py-4 fade-left overflow-hidden"
        style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", animationDelay: "0.35s", minHeight: 90 }}
      >
        {/* progress bar */}
        <div className="absolute bottom-0 left-0 h-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.35)", width: "100%" }}>
          <div
            key={quoteIndex}
            className="h-full rounded-full"
            style={{ background: "white", animation: "quoteProgress 4s linear forwards" }}
          />
        </div>
        <div className={fadeIn ? "quote-in" : "quote-out"} key={quoteIndex}>
          <p className="text-white/85 text-sm italic leading-relaxed" style={{ fontFamily: "'Playfair Display', serif" }}>
            "{q.text}"
          </p>
          <p className="text-white/50 text-xs mt-2 font-medium">— {q.author}</p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState("");
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setQuoteIndex((i) => (i + 1) % QUOTES.length);
        setFadeIn(true);
      }, 420);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setError("");
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden"
      style={{ fontFamily: "'Outfit', sans-serif", background: "linear-gradient(135deg, #f5f3ff 0%, #fce7f3 50%, #eff6ff 100%)" }}
    >
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmerBtn {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes blobDrift {
          0%, 100% { transform: translate(0,0) scale(1); }
          33%       { transform: translate(20px,-18px) scale(1.06); }
          66%       { transform: translate(-14px,12px) scale(0.96); }
        }
        @keyframes btnPulse {
          0%, 100% { box-shadow: 0 4px 20px rgba(124,92,252,0.35); }
          50%       { box-shadow: 0 4px 32px rgba(244,63,154,0.45); }
        }
        @keyframes ripple {
          from { transform: scale(0); opacity: 0.4; }
          to   { transform: scale(2.5); opacity: 0; }
        }
        @keyframes quoteProgress {
          from { width: 0%; }
          to   { width: 100%; }
        }
        .slide-up { animation: slideUp 0.65s cubic-bezier(0.22,1,0.36,1) both; }
        .btn-shimmer {
          background: linear-gradient(90deg, #7c5cfc, #f43f9a, #818cf8, #7c5cfc);
          background-size: 300% 100%;
          animation: shimmerBtn 3s linear infinite;
          transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
        }
        .btn-shimmer:hover {
          transform: translateY(-2px) scale(1.015);
          filter: brightness(1.08);
          animation: shimmerBtn 3s linear infinite, btnPulse 2s ease-in-out infinite;
        }
        .btn-shimmer:active { transform: translateY(0) scale(0.98); }
        .btn-google {
          transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, border-color 0.18s ease;
        }
        .btn-google:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(124,92,252,0.15);
        }
        .btn-google:active { transform: translateY(0); }
        .blob { animation: blobDrift var(--dur) ease-in-out infinite; }
        .card-shadow {
          box-shadow: 0 4px 6px rgba(124,92,252,0.06), 0 20px 60px rgba(124,92,252,0.1), 0 0 0 1px rgba(124,92,252,0.1);
        }
      `}</style>

      {/* Background blobs */}
      {[
        { color: "#c4b5fd", x: "-5%", y: "-8%", w: 480, dur: "12s" },
        { color: "#fbcfe8", x: "60%", y: "60%", w: 400, dur: "15s" },
        { color: "#bae6fd", x: "40%", y: "-10%", w: 320, dur: "10s" },
      ].map((b, i) => (
        <div
          key={i}
          className="blob absolute rounded-full pointer-events-none"
          style={{
            left: b.x, top: b.y,
            width: b.w, height: b.w,
            background: b.color,
            opacity: 0.35,
            filter: "blur(70px)",
            "--dur": b.dur,
          } as React.CSSProperties}
        />
      ))}

      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(124,92,252,0.12) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Split card */}
      <div
        className={`relative z-10 flex rounded-3xl overflow-hidden card-shadow w-full mx-4 ${mounted ? "slide-up" : "opacity-0"}`}
        style={{ maxWidth: 900, minHeight: 560 }}
      >
        {/* LEFT — Brand panel */}
        <div
          className="hidden md:flex flex-col w-[45%] shrink-0"
          style={{ background: "linear-gradient(145deg, #7c5cfc 0%, #a855f7 45%, #f43f9a 100%)" }}
        >
          <LeftPanel quoteIndex={quoteIndex} fadeIn={fadeIn} />
        </div>

        {/* RIGHT — Login form */}
        <div className="flex-1 flex flex-col justify-center px-10 py-12 bg-white">

          {/* Mobile-only brand name */}
          <div className="md:hidden flex items-center gap-2 mb-8 justify-center">
            <GraduationCap size={20} style={{ color: "#7c5cfc" }} />
            <span
              className="text-2xl font-bold"
              style={{
                fontFamily: "'Playfair Display', serif",
                background: "linear-gradient(90deg,#7c5cfc,#f43f9a)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Prashiksha
            </span>
          </div>

          <h2 className="text-2xl font-bold mb-1" style={{ color: "#1a0a4e", fontFamily: "'Outfit', sans-serif" }}>
            Sign in to your account
          </h2>
          <p className="text-sm mb-8" style={{ color: "#8a84b4" }}>
            Continue your learning journey
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#7c5cfc" }}>Email</label>
              <div
                className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200"
                style={{
                  background: "#f5f3ff",
                  border: `1.5px solid ${focused === "email" ? "#7c5cfc" : "rgba(124,92,252,0.18)"}`,
                  boxShadow: focused === "email" ? "0 0 0 3px rgba(124,92,252,0.1)" : "none",
                }}
              >
                <Mail size={15} style={{ color: focused === "email" ? "#7c5cfc" : "#a5a3c2", flexShrink: 0 }} />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused("email")}
                  onBlur={() => setFocused(null)}
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: "#1a0a4e" }}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#f43f9a" }}>Password</label>
                <button type="button" className="text-xs font-medium transition-colors" style={{ color: "#7c5cfc" }}>
                  Forgot password?
                </button>
              </div>
              <div
                className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200"
                style={{
                  background: "#fff5f9",
                  border: `1.5px solid ${focused === "password" ? "#f43f9a" : "rgba(244,63,154,0.18)"}`,
                  boxShadow: focused === "password" ? "0 0 0 3px rgba(244,63,154,0.1)" : "none",
                }}
              >
                <Lock size={15} style={{ color: focused === "password" ? "#f43f9a" : "#a5a3c2", flexShrink: 0 }} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: "#1a0a4e" }}
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} style={{ color: "#a5a3c2" }} tabIndex={-1}>
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2.5 cursor-pointer mt-0.5">
              <input type="checkbox" className="accent-purple-600 w-3.5 h-3.5 rounded" />
              <span className="text-xs" style={{ color: "#8a84b4" }}>Remember me for 30 days</span>
            </label>

            {error && <p className="text-xs text-center" style={{ color: "#d4183d" }}>{error}</p>}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-shimmer mt-1 flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.3"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  Signing in…
                </span>
              ) : (
                <>Sign In <ArrowRight size={15} /></>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: "rgba(124,92,252,0.12)" }} />
            <span className="text-xs" style={{ color: "#b0acd4" }}>or continue with</span>
            <div className="flex-1 h-px" style={{ background: "rgba(124,92,252,0.12)" }} />
          </div>

          {/* Google */}
          <button
            type="button"
            className="btn-google w-full flex items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-medium"
            style={{ background: "#f9f8ff", border: "1.5px solid rgba(124,92,252,0.15)", color: "#1a0a4e" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#7c5cfc"; e.currentTarget.style.background = "#f3f0ff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(124,92,252,0.15)"; e.currentTarget.style.background = "#f9f8ff"; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M5.27 9.76A7.08 7.08 0 0 1 12 4.9c1.76 0 3.35.63 4.6 1.67l3.41-3.41A12 12 0 0 0 0 12c0 1.99.49 3.86 1.35 5.51l3.92-3.04A7.1 7.1 0 0 1 5.27 9.76Z"/>
              <path fill="#FBBC05" d="M12 24c3.24 0 6.01-1.07 8.01-2.91l-3.91-3.03A7.11 7.11 0 0 1 5.26 14.5L1.35 17.5A12 12 0 0 0 12 24Z"/>
              <path fill="#4285F4" d="M23.76 12.27c0-.79-.07-1.56-.19-2.27H12v4.51h6.61a5.65 5.65 0 0 1-2.46 3.7l3.91 3.03C22.56 19.01 23.76 15.87 23.76 12.27Z"/>
              <path fill="#34A853" d="M5.26 14.5a7.13 7.13 0 0 1 0-4.74L1.34 6.72A12.02 12.02 0 0 0 0 12c0 1.93.46 3.76 1.35 5.51L5.26 14.5Z"/>
            </svg>
            Continue with Google
          </button>

          <p className="text-center text-xs mt-6" style={{ color: "#b0acd4" }}>
            New to Prashiksha?{" "}
            <button
              type="button"
              className="font-semibold transition-all duration-150"
              style={{ color: "#7c5cfc" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#f43f9a"; e.currentTarget.style.letterSpacing = "0.01em"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#7c5cfc"; e.currentTarget.style.letterSpacing = "0"; }}
            >
              Create a free account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
