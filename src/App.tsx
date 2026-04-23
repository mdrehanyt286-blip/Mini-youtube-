import React, { useState, useEffect } from 'react';
import { Search, Mic, MicOff, Home, PlaySquare, History, LogIn, LogOut, User, Menu, Music, Play, Plus, Trash2, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, signInWithGoogle, logout, db, collection, addDoc, query, where, onSnapshot, serverTimestamp, deleteDoc, doc, updateDoc } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import axios from 'axios';
import { Video, Playlist, HistoryItem } from './types';
import VideoCard from './components/VideoCard';
import VideoPlayer from './components/VideoPlayer';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import UploadModal from './components/UploadModal';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMusicMode, setIsMusicMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'playlists' | 'history'>('home');
  const [currentCategory, setCurrentCategory] = useState('All');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [userVideos, setUserVideos] = useState<Video[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isIncognito, setIsIncognito] = useState(false);

  const categories = [
    { id: 'All', label: 'Sab' },
    { id: 'Latest', label: 'Naya' },
    { id: 'Uploaded', label: 'Dali Hui' },
    { id: 'Music', label: 'Sangeet' },
    { id: 'Movies', label: 'Filmein' },
    { id: 'Adult Movies', label: '18+ Movies' },
    { id: 'Sexy Videos', label: 'Sexy Videos' },
    { id: 'Web Series', label: 'Web Series' },
    { id: 'Hindi', label: 'Hindi' },
    { id: 'Bhojpuri', label: 'Bhojpuri' },
    { id: 'Gaming', label: 'Khel' },
    { id: 'AI', label: 'AI' }
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'userVideos'));
    const unsubUserVideos = onSnapshot(q, (snapshot) => {
      setUserVideos(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    }, (err) => {
      console.error("userVideos sync error:", err.message);
    });
    return () => unsubUserVideos();
  }, []);

  useEffect(() => {
    if (user) {
      const q = query(collection(db, 'playlists'), where('userId', '==', user.uid));
      const unsubPlaylists = onSnapshot(q, (snapshot) => {
        setPlaylists(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Playlist)));
      }, (err) => {
        console.error("playlists sync error:", err.message);
      });

      const hq = query(collection(db, 'history'), where('userId', '==', user.uid));
      const unsubHistory = onSnapshot(hq, (snapshot) => {
        const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as HistoryItem));
        items.sort((a, b) => b.watchedAt?.seconds - a.watchedAt?.seconds);
        setHistory(items);
      }, (err) => {
        console.error("history sync error:", err.message);
      });

      return () => {
        unsubPlaylists();
        unsubHistory();
      };
    }
  }, [user]);

  useEffect(() => {
    fetchTrending();
  }, []);

  useEffect(() => {
    if (currentCategory === 'Uploaded') {
      setVideos(userVideos);
    }
  }, [userVideos, currentCategory]);

  const fetchTrending = async (category = 'All', isMore = false) => {
    if (isMore && !nextPageToken) return;
    if (isMore) setIsFetchingMore(true);
    else {
      setErrorMsg(null);
      setNextPageToken(null);
    }

    try {
      const endpoint = category === 'All' ? '/api/videos/trending' : `/api/videos/search?q=${category}`;
      const tokenParam = isMore && nextPageToken ? `&pageToken=${nextPageToken}` : '';
      const separator = endpoint.includes('?') ? '&' : '?';
      
      const res = await axios.get(`${endpoint}${separator}${tokenParam}`);
      const items = res.data.items.map((item: any) => ({
        id: item.id.videoId || item.id,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.high.url,
        channelTitle: item.snippet.channelTitle,
        description: item.snippet.description,
        publishedAt: item.snippet.publishedAt,
        viewCount: item.statistics?.viewCount,
        commentCount: item.statistics?.commentCount,
      }));

      if (isMore) {
        setVideos(prev => {
          const seen = new Set(prev.map(v => v.id));
          const uniqueNewItems = items.filter((v: any) => !seen.has(v.id));
          return [...prev, ...uniqueNewItems];
        });
      } else {
        setVideos(items);
      }
      setNextPageToken(res.data.nextPageToken || null);
    } catch (err: any) {
      const respData = err.response?.data;
      const msg = typeof respData?.detail === 'string' 
        ? respData.detail 
        : (typeof respData?.error === 'string' ? respData.error : "Network Error: API se jud nahi pa rahe.");
      setErrorMsg(msg);
    } finally {
      setIsFetchingMore(false);
    }
  };

  const handleSearch = async (q: string, isMore = false) => {
    if (isMore && !nextPageToken) return;
    if (isMore) setIsFetchingMore(true);
    else {
      setErrorMsg(null);
      setSearchQuery(q);
      setNextPageToken(null);
    }
    
    if (!q.trim() && !isMore) { fetchTrending(); return; }
    
    try {
      const tokenParam = isMore && nextPageToken ? `&pageToken=${nextPageToken}` : '';
      const res = await axios.get(`/api/videos/search?q=${encodeURIComponent(isMore ? searchQuery : q)}${tokenParam}`);
      const items = res.data.items
        .map((item: any) => ({
          id: item.id.videoId || item.id, // Handle cases where ID might be string or object
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.high.url,
          channelTitle: item.snippet.channelTitle,
          description: item.snippet.description,
          publishedAt: item.snippet.publishedAt,
          viewCount: item.statistics?.viewCount,
          commentCount: item.statistics?.commentCount,
        }));

      if (isMore) {
        setVideos(prev => {
          const seen = new Set(prev.map(v => v.id));
          const uniqueNewItems = items.filter((v: any) => v.id && !seen.has(v.id));
          return [...prev, ...uniqueNewItems];
        });
      } else {
        setVideos(items.filter((v: any) => v.id));
        setActiveTab('home');
        setSelectedVideo(null);
        setIsMinimized(false);
      }
      setNextPageToken(res.data.nextPageToken || null);
    } catch (err: any) {
      const respData = err.response?.data;
      const msg = typeof respData?.detail === 'string' 
        ? respData.detail 
        : (typeof respData?.error === 'string' ? respData.error : "Search fail ho gaya bhaya.");
      setErrorMsg(msg);
    } finally {
      setIsFetchingMore(false);
    }
  };

  const addToHistory = async (video: Video) => {
    if (!user || isIncognito) return;
    try {
      await addDoc(collection(db, 'history'), {
        userId: user.uid,
        videoId: video.id,
        title: video.title,
        thumbnail: video.thumbnail,
        watchedAt: serverTimestamp(),
      });
    } catch (err) { console.error(err); }
  };

  const handleCategoryClick = (cat: string) => {
    setCurrentCategory(cat);
    setNextPageToken(null);
    setSearchQuery(''); // Clear search query on category change
    
    // Auto Incognito for Adult Categories
    if (cat === 'Adult Movies' || cat === 'Sexy Videos') {
      setIsIncognito(true);
    }

    if (cat === 'Uploaded') {
      setActiveTab('home');
      setSelectedVideo(null);
    } else {
      handleSearch(cat === 'All' ? '' : cat);
    }
  };

  const handleUpload = async (videoData: { videoId: string, title: string, description?: string }) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'userVideos'), {
        userId: user.uid,
        videoId: videoData.videoId,
        title: videoData.title,
        description: videoData.description || '',
        thumbnail: `https://img.youtube.com/vi/${videoData.videoId}/hqdefault.jpg`,
        channelTitle: user.displayName || 'Creator',
        createdAt: serverTimestamp(),
      });
      setShowUploadModal(false);
      setCurrentCategory('Uploaded');
      setActiveTab('home');
    } catch (err) { console.error(err); }
  };

  const createPlaylist = async (name: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'playlists'), {
        userId: user.uid,
        name,
        videos: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) { console.error(err); }
  };

  const addToPlaylist = async (playlistId: string, video: Video) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;
    try {
      const newVideos = [...playlist.videos, video];
      await updateDoc(doc(db, 'playlists', playlistId), {
        videos: newVideos,
        updatedAt: serverTimestamp(),
      });
    } catch (err) { console.error(err); }
  };

  const handleScroll = (e: any) => {
    if (activeTab !== 'home' || selectedVideo || showUploadModal) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    
    // Trigger when 200px from bottom
    if (scrollHeight - scrollTop <= clientHeight + 300 && !isFetchingMore && nextPageToken) {
      if (searchQuery) handleSearch(searchQuery, true);
      else fetchTrending(currentCategory, true);
    }
  };

  return (
    <div className={`flex flex-col h-screen overflow-hidden transition-colors duration-500 ${isIncognito ? 'bg-black' : 'bg-yt-black'}`}>
      <Navbar 
        user={user} 
        onSearch={handleSearch} 
        isMusicMode={isMusicMode} 
        setIsMusicMode={setIsMusicMode}
        onUpload={() => setShowUploadModal(true)}
        isIncognito={isIncognito}
        setIsIncognito={setIsIncognito}
      />
      
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <main 
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 lg:p-6 pb-24 text-center sm:text-left scroll-smooth"
        >
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl mb-6 flex items-center justify-center gap-3">
              <span className="font-medium">{errorMsg}</span>
              <button 
                onClick={() => fetchTrending(currentCategory)}
                className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm font-bold hover:bg-red-600 transition-colors"
              >
                Phir se Koshish Karein
              </button>
            </div>
          )}
          {!selectedVideo && activeTab === 'home' && (
            <div className="flex gap-3 overflow-x-auto pb-4 mb-4 scrollbar-hide no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.id)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    currentCategory === cat.id ? 'bg-white text-black' : 'bg-yt-dark-grey hover:bg-white/10'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}
          
          <AnimatePresence mode="wait">
            {selectedVideo && !isMinimized ? (
              <motion.div
                key="player"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="z-10 relative"
              >
                <VideoPlayer 
                  video={selectedVideo} 
                  user={user}
                  isMusicMode={isMusicMode}
                  onClose={() => { setSelectedVideo(null); setIsMinimized(false); }}
                  onMinimize={() => setIsMinimized(true)}
                  playlists={playlists}
                  onAddToPlaylist={addToPlaylist}
                  onCreatePlaylist={createPlaylist}
                  onVideoSelect={(v) => { setSelectedVideo(v); addToHistory(v); }}
                />
              </motion.div>
            ) : (
              <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {activeTab === 'home' && (
                  <>
                    <div className="video-grid">
                      {videos.map(v => (
                        <VideoCard key={v.id} video={v} onClick={() => { setSelectedVideo(v); setIsMinimized(false); addToHistory(v); }} />
                      ))}
                    </div>
                    {isFetchingMore && (
                      <div className="flex justify-center p-12 col-span-full">
                        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </>
                )}
                {activeTab === 'playlists' && (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold">Your Playlists</h2>
                      <button onClick={() => { const name = prompt('Playlist Name:'); if (name) createPlaylist(name); }} className="bg-yt-dark-grey hover:bg-white/10 px-4 py-2 rounded-full flex items-center gap-2">
                        <Plus size={20} /> Create New
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {playlists.map(p => (
                        <div key={p.id} className="bg-yt-dark-grey p-4 rounded-xl">
                          <h3 className="font-bold text-lg mb-4">{p.name}</h3>
                          <div className="space-y-2">
                            {p.videos.slice(0, 3).map(v => ( <div key={v.id} className="flex items-center gap-2"> <img src={v.thumbnail} className="w-12 h-8 rounded object-cover" /> <span className="text-sm truncate">{v.title}</span> </div> ))}
                            <button onClick={() => { setVideos(p.videos); setActiveTab('home'); }} className="w-full mt-4 bg-white text-black py-2 rounded-lg font-medium hover:bg-white/90">Play Playlist</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {activeTab === 'history' && (
                  <div className="max-w-4xl mx-auto space-y-4">
                    <h2 className="text-2xl font-bold mb-6">Watch History</h2>
                    {history.map(item => (
                      <div key={item.id} className="flex gap-4 p-2 hover:bg-yt-dark-grey rounded-xl cursor-pointer" onClick={() => { setSelectedVideo({ id: item.videoId, title: item.title, thumbnail: item.thumbnail, channelTitle: '', description: '', publishedAt: '' }); setIsMinimized(false); }}>
                        <img src={item.thumbnail} className="w-48 aspect-video rounded-lg object-cover" />
                        <div> <h3 className="font-bold line-clamp-2">{item.title}</h3> <p className="text-sm text-yt-light-grey mt-1">Watched recently</p> </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Persistent Mini Player */}
          <AnimatePresence>
            {isMinimized && selectedVideo && (
              <motion.div initial={{ scale: 0, opacity: 0, x: 100 }} animate={{ scale: 1, opacity: 1, x: 0 }} exit={{ scale: 0, opacity: 0, x: 100 }} className="fixed bottom-24 right-4 w-72 bg-yt-dark-grey rounded-xl overflow-hidden shadow-2xl border border-white/20 z-[60] group">
                <div className="relative aspect-video">
                  <iframe src={`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1`} className="w-full h-full pointer-events-none" frameBorder="0" />
                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button onClick={(e) => { e.stopPropagation(); setIsMinimized(false); setSelectedVideo(null); }} className="p-1.5 bg-black/60 hover:bg-black rounded-full"> <Plus className="rotate-45" size={16} /> </button>
                    <button onClick={() => setIsMinimized(false)} className="p-1.5 bg-black/60 hover:bg-black rounded-full"> <Menu size={16} /> </button>
                  </div>
                  <div className="absolute inset-0 cursor-pointer" onClick={() => setIsMinimized(false)} />
                </div>
                <div className="p-3"> <p className="text-xs font-bold line-clamp-1">{selectedVideo.title}</p> <p className="text-[10px] text-yt-light-grey">{selectedVideo.channelTitle}</p> </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Upload Modal */}
          <UploadModal 
            isOpen={showUploadModal} 
            onClose={() => setShowUploadModal(false)} 
            onUpload={handleUpload} 
          />
        </main>
      </div>
    </div>
  );
}
