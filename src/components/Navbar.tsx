import React, { useState, useEffect } from 'react';
import { Search, Mic, MicOff, LogIn, LogOut, Music, Youtube, Upload, User as UserIcon } from 'lucide-react';
import { signInWithGoogle, logout } from '../firebase';
import { User } from 'firebase/auth';

interface NavbarProps {
  user: User | null;
  onSearch: (q: string) => void;
  isMusicMode: boolean;
  setIsMusicMode: (val: boolean) => void;
  onUpload: () => void;
  isIncognito: boolean;
  setIsIncognito: (val: boolean) => void;
}

export default function Navbar({ user, onSearch, isMusicMode, setIsMusicMode, onUpload, isIncognito, setIsIncognito }: NavbarProps) {
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice search not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.start();
    setIsListening(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      handleVoiceCommand(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
  };

  const handleVoiceCommand = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.startsWith('play song ') || lower.startsWith('play music ')) {
      const song = lower.replace(/play (song|music) /, '');
      onSearch(song);
    } else if (lower.startsWith('search video ') || lower.startsWith('search movie ')) {
      const q = lower.replace(/search (video|movie) /, '');
      onSearch(q);
    } else if (lower.startsWith('play movie ')) {
      const movie = lower.replace('play movie ', '');
      onSearch(movie);
    } else {
      onSearch(text);
    }
  };

  return (
    <nav className={`flex flex-col md:flex-row items-center justify-between px-4 py-2 md:h-14 border-b sticky top-0 z-50 gap-3 md:gap-0 transition-colors duration-500 ${isIncognito ? 'bg-zinc-900 border-purple-500/50' : 'bg-yt-black border-white/10'}`}>
      <div className="flex items-center justify-between w-full md:w-auto">
        <div className="flex items-center gap-1 cursor-pointer" onClick={() => onSearch('')}>
          <div className={`${isIncognito ? 'bg-purple-600' : 'bg-red-600'} rounded-lg p-1 transition-colors duration-500`}>
            <Youtube size={24} fill="white" stroke="none" />
          </div>
          <span className="text-xl font-bold tracking-tighter">MiniTube <span className={isIncognito ? 'text-purple-500' : 'text-red-600'}>AI</span></span>
          {isIncognito && <span className="ml-2 text-[10px] bg-purple-600 px-1.5 py-0.5 rounded text-white font-bold animate-pulse">PRIVATE</span>}
        </div>

        <div className="flex md:hidden items-center gap-2">
          {user ? (
            <img src={user.photoURL || ''} className="w-8 h-8 rounded-full border border-white/10" alt="Avatar" />
          ) : (
            <button onClick={signInWithGoogle} className="text-blue-400 p-1"><LogIn size={20}/></button>
          )}
        </div>
      </div>

      <div className="flex-1 w-full max-w-2xl md:mx-10 flex items-center gap-2 md:gap-4">
        <form 
          className="flex flex-1"
          onSubmit={(e) => { 
            e.preventDefault(); 
            if (query.trim()) onSearch(query); 
          }}
        >
          <div className="flex-1 flex bg-yt-dark-grey rounded-l-full px-4 items-center focus-within:ring-1 ring-blue-500">
            <Search size={18} className="text-yt-light-grey mr-2" />
            <input 
              type="text" 
              placeholder="Song ya Movie search karein..." 
              className="w-full bg-transparent py-2 outline-none text-sm md:text-base"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button 
            type="submit"
            className="bg-red-600 hover:bg-red-700 px-4 md:px-6 rounded-r-full transition-colors flex items-center justify-center gap-2"
            title="Search button"
          >
            <Search size={20} className="text-white" />
            <span className="hidden lg:inline text-sm font-bold">Search Karein</span>
          </button>
        </form>
        
        <button 
          onClick={startListening}
          className={`p-2 rounded-full transition-colors flex-shrink-0 ${isListening ? 'bg-red-600 animate-pulse' : 'bg-white/10 hover:bg-white/20'}`}
          title="Voice Search"
        >
          {isListening ? <MicOff size={22} /> : <Mic size={22} />}
        </button>

        <button 
          onClick={() => onUpload()}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors hidden sm:flex items-center gap-2 px-4 ml-2"
          title="Video Daliye"
        >
          <Upload size={20} />
          <span className="text-sm font-bold">Upload</span>
        </button>
      </div>

      <div className="hidden md:flex items-center gap-2 md:gap-4">
        <button 
          onClick={() => setIsMusicMode(!isMusicMode)}
          className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${isMusicMode ? 'bg-red-600' : 'bg-white/10 hover:bg-white/20'}`}
        >
          <Music size={18} />
          <span className="text-sm font-medium">Music Mode</span>
        </button>

        <button 
          onClick={() => setIsIncognito(!isIncognito)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${isIncognito ? 'bg-purple-600 text-white' : 'bg-white/10 hover:bg-white/20'}`}
          title={isIncognito ? "Incognito Mode Band Karein" : "Incognito Mode Chalu Karein"}
        >
          <div className="relative">
            <UserIcon size={18} />
            <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${isIncognito ? 'bg-white' : 'bg-transparent'}`} />
          </div>
          <span className="text-sm font-medium hidden lg:inline">{isIncognito ? 'Incognito: ON' : 'Private Mode'}</span>
        </button>

        {user ? (
          <div className="flex items-center gap-3">
            <img src={user.photoURL || ''} className="w-8 h-8 rounded-full border border-white/10" alt="Avatar" />
            <button 
              onClick={logout}
              className="text-yt-light-grey hover:text-white transition-colors"
            >
              <LogOut size={20} />
            </button>
          </div>
        ) : (
          <button 
            onClick={signInWithGoogle}
            className="flex items-center gap-2 px-3 py-1 border border-white/30 rounded-full text-blue-400 hover:bg-blue-400/10"
          >
            <LogIn size={20} />
            <span className="font-medium">Sign In</span>
          </button>
        )}
      </div>
    </nav>
  );
}
