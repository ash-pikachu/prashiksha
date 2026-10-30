=== OLD ===
      {/* Stats */}
      <div className="relative z-10 flex gap-8 fade-left" style={{ animationDelay: "0.2s" }}>
        {STATS.map(({ value, label }) => (
          <div key={label} className="flex flex-col gap-0.5">
            <span className="text-white font-bold text-xl" style={{ fontFamily: "'Outfit', sans-serif" }}>{value}</span>
            <span className="text-white/55 text-xs tracking-wide">{label}</span>
          </div>
        ))}
      </div>
=== NEW ===
      {/* Features */}
      <div className="relative z-10 flex flex-col gap-2.5 fade-left" style={{ animationDelay: "0.2s" }}>
        {FEATURES.map(({ icon, text }) => (
          <div key={text} className="flex items-center gap-3">
            <span className="text-base leading-none">{icon}</span>
            <span className="text-white/75 text-sm">{text}</span>
          </div>
        ))}
      </div>