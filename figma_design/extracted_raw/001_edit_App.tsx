=== OLD ===
import { Search, User } from 'lucide-react';
import { useState } from 'react';

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [level] = useState<'beginner' | 'intermediate' | 'expert'>('intermediate');

  const cartoonImages = [
    'https://images.unsplash.com/photo-1769008301392-3567c972c437?w=400',
    'https://images.unsplash.com/photo-1764885517932-f029bb7236f8?w=400',
    'https://images.unsplash.com/photo-1722498256948-348c674cc87a?w=400',
    'https://images.unsplash.com/photo-1752441226946-d9bcbbc7f9a7?w=400',
    'https://images.unsplash.com/photo-1767925539079-57e614ea83f3?w=400',
    'https://images.unsplash.com/photo-1755962270071-d8e353c7ca97?w=400',
    'https://images.unsplash.com/photo-1760265081336-87017a6fc925?w=400',
    'https://images.unsplash.com/photo-1758899056905-3863af86cc49?w=400',
    'https://images.unsplash.com/photo-1703694741143-1e55f04c92fc?w=400',
    'https://images.unsplash.com/photo-1707141955104-7e14e6710736?w=400',
    'https://images.unsplash.com/photo-1758530052544-49938a5e9c60?w=400',
    'https://images.unsplash.com/photo-1765947381747-2323716ed899?w=400',
  ];

  const getLevelColor = () => {
    switch (level) {
      case 'beginner':
        return 'bg-green-500';
      case 'intermediate':
        return 'bg-yellow-500';
      case 'expert':
        return 'bg-purple-500';
    }
  };

  return (
    <div className="size-full bg-gradient-to-br from-blue-50 to-purple-50 overflow-hidden relative">
      {/* User Info - Top Left */}
      <div className="absolute top-8 left-8 z-20 bg-white rounded-2xl shadow-lg p-4 flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center">
          <User className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="font-semibold text-gray-800">User123</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${getLevelColor()} transition-all`}
                style={{ width: level === 'beginner' ? '33%' : level === 'intermediate' ? '66%' : '100%' }}
              />
            </div>
            <span className="text-xs font-medium text-gray-600 capitalize">{level}</span>
          </div>
        </div>
      </div>

      {/* Floating Cartoon Images */}
      <div className="absolute inset-0 pointer-events-none">
        {cartoonImages.map((img, idx) => {
          const positions = [
            { top: '5%', left: '5%', rotate: '-12deg', size: 'w-32 h-32' },
            { top: '15%', right: '8%', rotate: '8deg', size: 'w-28 h-28' },
            { top: '45%', left: '3%', rotate: '15deg', size: 'w-36 h-36' },
            { top: '70%', left: '10%', rotate: '-8deg', size: 'w-32 h-32' },
            { bottom: '8%', left: '25%', rotate: '12deg', size: 'w-28 h-28' },
            { bottom: '5%', right: '5%', rotate: '-15deg', size: 'w-36 h-36' },
            { top: '60%', right: '5%', rotate: '10deg', size: 'w-32 h-32' },
            { top: '30%', right: '15%', rotate: '-10deg', size: 'w-28 h-28' },
            { bottom: '35%', left: '8%', rotate: '18deg', size: 'w-24 h-24' },
            { top: '80%', right: '20%', rotate: '-12deg', size: 'w-28 h-28' },
            { top: '10%', left: '30%', rotate: '5deg', size: 'w-24 h-24' },
            { bottom: '15%', right: '30%', rotate: '-18deg', size: 'w-24 h-24' },
          ];

          const pos = positions[idx];
          return (
            <div
              key={idx}
              className={`absolute ${pos.size} rounded-2xl overflow-hidden shadow-xl transform transition-transform hover:scale-110 pointer-events-auto cursor-pointer`}
              style={{
                top: pos.top,
                left: pos.left,
                right: pos.right,
                bottom: pos.bottom,
                transform: `rotate(${pos.rotate})`,
              }}
            >
              <img
                src={img}
                alt={`Cartoon ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          );
        })}
      </div>

      {/* Center Content */}
      <div className="relative z-10 size-full flex flex-col items-center justify-center px-8">
        {/* Name */}
        <h1 className="text-6xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent mb-8 drop-shadow-lg">
          Prashiksha
        </h1>

        {/* Search Bar */}
        <div className="w-full max-w-2xl">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 rounded-full blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
            <div className="relative bg-white rounded-full shadow-2xl flex items-center px-6 py-4">
              <Search className="w-6 h-6 text-gray-400 mr-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for cartoons..."
                className="flex-1 outline-none text-lg text-gray-700 placeholder-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="mt-8 flex gap-4">
          <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
          <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>
  );
}
=== NEW ===
import { Search, User, Sparkles } from 'lucide-react';
import { useState } from 'react';

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [level] = useState<'beginner' | 'intermediate' | 'expert'>('intermediate');

  const cartoonImages = [
    'https://images.unsplash.com/photo-1769008301392-3567c972c437?w=400',
    'https://images.unsplash.com/photo-1764885517932-f029bb7236f8?w=400',
    'https://images.unsplash.com/photo-1722498256948-348c674cc87a?w=400',
    'https://images.unsplash.com/photo-1752441226946-d9bcbbc7f9a7?w=400',
    'https://images.unsplash.com/photo-1767925539079-57e614ea83f3?w=400',
    'https://images.unsplash.com/photo-1755962270071-d8e353c7ca97?w=400',
    'https://images.unsplash.com/photo-1760265081336-87017a6fc925?w=400',
    'https://images.unsplash.com/photo-1758899056905-3863af86cc49?w=400',
    'https://images.unsplash.com/photo-1703694741143-1e55f04c92fc?w=400',
    'https://images.unsplash.com/photo-1707141955104-7e14e6710736?w=400',
    'https://images.unsplash.com/photo-1758530052544-49938a5e9c60?w=400',
    'https://images.unsplash.com/photo-1765947381747-2323716ed899?w=400',
  ];

  const getLevelColor = () => {
    switch (level) {
      case 'beginner':
        return 'bg-green-500';
      case 'intermediate':
        return 'bg-yellow-500';
      case 'expert':
        return 'bg-purple-500';
    }
  };

  return (
    <div className="size-full bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 overflow-hidden relative min-h-screen">
      {/* User Info - Top Left */}
      <div className="absolute top-6 left-6 z-20 bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl p-5 flex items-center gap-4 border border-purple-100">
        <div className="w-14 h-14 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
          <User className="w-7 h-7 text-white" />
        </div>
        <div>
          <p className="font-bold text-gray-900 text-lg">User123</p>
          <div className="flex items-center gap-3 mt-1.5">
            <div className="w-24 h-2.5 bg-gray-200 rounded-full overflow-hidden shadow-inner">
              <div
                className={`h-full ${getLevelColor()} transition-all duration-500 shadow-sm`}
                style={{ width: level === 'beginner' ? '33%' : level === 'intermediate' ? '66%' : '100%' }}
              />
            </div>
            <span className="text-sm font-semibold text-gray-700 capitalize">{level}</span>
          </div>
        </div>
      </div>

      {/* Floating Cartoon Images - Optimized for Laptop */}
      <div className="absolute inset-0 pointer-events-none">
        {cartoonImages.map((img, idx) => {
          const positions = [
            { top: '8%', left: '4%', rotate: '-12deg', size: 'w-40 h-40' },
            { top: '12%', right: '5%', rotate: '8deg', size: 'w-36 h-36' },
            { top: '45%', left: '2%', rotate: '15deg', size: 'w-44 h-44' },
            { top: '65%', left: '8%', rotate: '-8deg', size: 'w-36 h-36' },
            { bottom: '10%', left: '20%', rotate: '12deg', size: 'w-32 h-32' },
            { bottom: '6%', right: '4%', rotate: '-15deg', size: 'w-44 h-44' },
            { top: '55%', right: '3%', rotate: '10deg', size: 'w-40 h-40' },
            { top: '28%', right: '12%', rotate: '-10deg', size: 'w-32 h-32' },
            { bottom: '40%', left: '6%', rotate: '18deg', size: 'w-28 h-28' },
            { top: '75%', right: '18%', rotate: '-12deg', size: 'w-32 h-32' },
            { top: '6%', left: '25%', rotate: '5deg', size: 'w-28 h-28' },
            { bottom: '18%', right: '25%', rotate: '-18deg', size: 'w-28 h-28' },
          ];

          const pos = positions[idx];
          return (
            <div
              key={idx}
              className={`absolute ${pos.size} rounded-3xl overflow-hidden shadow-2xl transform transition-all duration-300 hover:scale-110 hover:shadow-3xl pointer-events-auto cursor-pointer border-4 border-white/50`}
              style={{
                top: pos.top,
                left: pos.left,
                right: pos.right,
                bottom: pos.bottom,
                transform: `rotate(${pos.rotate})`,
                animation: `float ${3 + idx * 0.5}s ease-in-out infinite`,
                animationDelay: `${idx * 0.2}s`,
              }}
            >
              <img
                src={img}
                alt={`Cartoon ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          );
        })}
      </div>

      {/* Center Content */}
      <div className="relative z-10 size-full flex flex-col items-center justify-center px-8">
        {/* Eye-Catching Name with Animations */}
        <div className="relative mb-12">
          {/* Sparkle Effects */}
          <div className="absolute -top-8 -left-8 animate-pulse">
            <Sparkles className="w-8 h-8 text-yellow-400 fill-yellow-400" />
          </div>
          <div className="absolute -top-6 -right-6 animate-pulse" style={{ animationDelay: '0.5s' }}>
            <Sparkles className="w-6 h-6 text-pink-400 fill-pink-400" />
          </div>
          <div className="absolute -bottom-4 left-12 animate-pulse" style={{ animationDelay: '1s' }}>
            <Sparkles className="w-7 h-7 text-purple-400 fill-purple-400" />
          </div>

          {/* Glowing Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 blur-3xl opacity-30 animate-pulse" />

          {/* Main Text */}
          <h1
            className="relative text-8xl font-black tracking-tight"
            style={{
              background: 'linear-gradient(45deg, #9333ea, #ec4899, #3b82f6, #8b5cf6, #ec4899, #9333ea)',
              backgroundSize: '300% 300%',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'gradient 4s ease infinite, textFloat 3s ease-in-out infinite',
              textShadow: '0 0 40px rgba(147, 51, 234, 0.3), 0 0 80px rgba(236, 72, 153, 0.2)',
            }}
          >
            Prashiksha
          </h1>

          {/* Underline Decoration */}
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 w-3/4 h-2 bg-gradient-to-r from-transparent via-purple-500 to-transparent rounded-full animate-pulse" />
        </div>

        {/* Search Bar */}
        <div className="w-full max-w-3xl">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-full blur-xl opacity-60 group-hover:opacity-90 transition-opacity duration-300 animate-pulse" />
            <div className="relative bg-white rounded-full shadow-2xl flex items-center px-8 py-5 border-2 border-purple-200">
              <Search className="w-7 h-7 text-purple-500 mr-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for amazing cartoons..."
                className="flex-1 outline-none text-xl text-gray-700 placeholder-gray-400"
              />
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                <Search className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="mt-10 flex gap-5">
          <div className="w-4 h-4 bg-purple-500 rounded-full animate-bounce shadow-lg" style={{ animationDelay: '0s' }} />
          <div className="w-4 h-4 bg-pink-500 rounded-full animate-bounce shadow-lg" style={{ animationDelay: '0.2s' }} />
          <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce shadow-lg" style={{ animationDelay: '0.4s' }} />
          <div className="w-4 h-4 bg-yellow-500 rounded-full animate-bounce shadow-lg" style={{ animationDelay: '0.6s' }} />
        </div>
      </div>

      <style>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes textFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(var(--rotation)); }
          50% { transform: translateY(-20px) rotate(var(--rotation)); }
        }
      `}</style>
    </div>
  );
}