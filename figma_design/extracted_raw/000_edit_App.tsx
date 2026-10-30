=== OLD ===
export default function App() {
  return (
    <div className="size-full flex items-center justify-center">
    </div>
  );
}
=== NEW ===
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