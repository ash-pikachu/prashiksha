=== OLD ===
      {/* Bottom quote */}
      <div
        className="relative z-10 mt-10 rounded-2xl px-5 py-4 fade-left"
        style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", animationDelay: "0.35s" }}
      >
        <p className="text-white/80 text-sm italic leading-relaxed" style={{ fontFamily: "'Playfair Display', serif" }}>
          "Education is the most powerful weapon which you can use to change the world."
        </p>
        <p className="text-white/45 text-xs mt-2 font-medium">— Nelson Mandela</p>
      </div>
=== NEW ===
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