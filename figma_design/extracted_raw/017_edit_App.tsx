=== OLD ===
        @keyframes fadeSlideLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to   { opacity: 1; transform: translateX(0); }
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
=== NEW ===
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