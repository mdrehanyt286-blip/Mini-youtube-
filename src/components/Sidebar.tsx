import React from 'react';
import { Home, PlaySquare, History, Compass, Film, Music2, Gamepad2, Trophy } from 'lucide-react';

interface SidebarProps {
  activeTab: 'home' | 'playlists' | 'history';
  setActiveTab: (tab: 'home' | 'playlists' | 'history') => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const items = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'playlists', icon: PlaySquare, label: 'Playlists' },
    { id: 'history', icon: History, label: 'History' },
  ];

  const explore = [
    { icon: Compass, label: 'Trending' },
    { icon: Music2, label: 'Music' },
    { icon: Film, label: 'Movies' },
    { icon: Gamepad2, label: 'Gaming' },
    { icon: Trophy, label: 'Sports' },
  ];

  return (
    <aside className="w-20 lg:w-60 bg-yt-black h-full overflow-y-auto scrollbar-hide py-3 hidden sm:block">
      <div className="px-2 lg:px-4 space-y-1">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`w-full flex flex-col lg:flex-row items-center gap-1 lg:gap-6 lg:px-6 py-3 rounded-xl font-medium transition-colors ${
              activeTab === item.id ? 'bg-yt-dark-grey' : 'hover:bg-white/10'
            }`}
          >
            <item.icon size={24} className={activeTab === item.id ? 'text-white' : 'text-yt-light-grey'} />
            <span className={`text-[10px] lg:text-sm ${activeTab === item.id ? '' : 'text-yt-light-grey'}`}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
      
      <div className="border-t border-white/10 my-4 mx-4 pt-4 hidden lg:block">
        <h3 className="px-6 text-sm font-bold mb-2">Explore</h3>
        <div className="space-y-1">
          {explore.map((item) => (
            <button
              key={item.label}
              className="w-full flex items-center gap-6 px-6 py-3 rounded-xl hover:bg-white/10 font-medium transition-colors text-yt-light-grey hover:text-white"
            >
              <item.icon size={24} />
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
