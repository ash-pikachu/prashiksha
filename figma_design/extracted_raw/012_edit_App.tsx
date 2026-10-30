=== OLD ===
        @keyframes blobDrift {
          0%, 100% { transform: translate(0,0) scale(1); }
          33%       { transform: translate(20px,-18px) scale(1.06); }
          66%       { transform: translate(-14px,12px) scale(0.96); }
        }
        .slide-up { animation: slideUp 0.65s cubic-bezier(0.22,1,0.36,1) both; }
        .btn-shimmer {
          background: linear-gradient(90deg, #7c5cfc, #f43f9a, #818cf8, #7c5cfc);
          background-size: 300% 100%;
          animation: shimmerBtn 3s linear infinite;
        }
        .blob { animation: blobDrift var(--dur) ease-in-out infinite; }
        .card-shadow {
          box-shadow: 0 4px 6px rgba(124,92,252,0.06), 0 20px 60px rgba(124,92,252,0.1), 0 0 0 1px rgba(124,92,252,0.1);
        }
=== NEW ===
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