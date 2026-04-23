import React, { useState, useEffect } from 'react';
import { Video, Playlist } from '../types';
import { X, Plus, ListPlus, Music, Minimize2, Send, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';
import axios from 'axios';
import { User } from 'firebase/auth';
import { db, collection, addDoc, query, where, onSnapshot, serverTimestamp } from '../firebase';
import { formatDistanceToNow } from 'date-fns';

interface VideoPlayerProps {
  video: Video;
  user: User | null;
  isMusicMode: boolean;
  onClose: () => void;
  onMinimize: () => void;
  playlists: Playlist[];
  onAddToPlaylist: (playlistId: string, video: Video) => void;
  onCreatePlaylist: (name: string) => void;
  onVideoSelect: (video: Video) => void;
}

const formatViews = (views?: string) => {
  if (!views) return '';
  const n = parseInt(views);
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M views';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K views';
  return n.toLocaleString() + ' views';
};

export default function VideoPlayer({ 
  video, 
  user,
  isMusicMode, 
  onClose, 
  onMinimize,
  playlists, 
  onAddToPlaylist,
  onCreatePlaylist,
  onVideoSelect
}: VideoPlayerProps) {
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    fetchRelated(false);
    
    // Fetch Comments
    const qC = query(collection(db, 'comments'), where('videoId', '==', video.id));
    const unsubComments = onSnapshot(qC, (snapshot) => {
      const cms = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      cms.sort((a: any, b: any) => b.createdAt?.seconds - a.createdAt?.seconds);
      setComments(cms);
    }, (err) => console.error("comments sync error:", err.message));

    // Check Subscription
    if (user) {
      const qS = query(collection(db, 'subscriptions'), where('userId', '==', user.uid), where('channelTitle', '==', video.channelTitle));
      const unsubSubs = onSnapshot(qS, (snapshot) => {
        setIsSubscribed(!snapshot.empty);
      }, (err) => console.error("subscriptions sync error:", err.message));
      return () => { unsubComments(); unsubSubs(); }
    }

    return () => unsubComments();
  }, [video.id, user]);

  const fetchRelated = async (isMore = false) => {
    if (isMore && !nextPageToken) return;
    if (isMore) setIsFetchingMore(true);
    else {
      setRelatedVideos([]);
      setNextPageToken(null);
    }

    try {
      const tokenParam = isMore && nextPageToken ? `&pageToken=${nextPageToken}` : '';
      const res = await axios.get(`/api/videos/related?videoId=${video.id}${tokenParam}`);
      const items = res.data.items
        .map((item: any) => ({
          id: item.id.videoId || item.id,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.high.url,
          channelTitle: item.snippet.channelTitle,
          description: item.snippet.description,
          publishedAt: item.snippet.publishedAt,
          viewCount: item.statistics?.viewCount,
          commentCount: item.statistics?.commentCount,
        }))
        .filter((v: any) => v.id && v.id !== video.id); // Avoid current video and empty IDs
      
      if (isMore) {
        setRelatedVideos(prev => {
          const seen = new Set(prev.map(v => v.id));
          const uniqueNewItems = items.filter((v: any) => !seen.has(v.id));
          return [...prev, ...uniqueNewItems];
        });
      } else {
        setRelatedVideos(items);
      }
      setNextPageToken(res.data.nextPageToken || null);
    } catch (err) { console.error(err); }
    finally { setIsFetchingMore(false); }
  };

  const handleScroll = (e: any) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 200 && !isFetchingMore && nextPageToken) {
      fetchRelated(true);
    }
  };

  const handleSubscribe = async () => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'subscriptions'), {
        userId: user.uid,
        channelTitle: video.channelTitle,
        subscribedAt: serverTimestamp(),
      });
    } catch (err) { console.error(err); }
  };

  const postComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !commentText.trim()) return;
    try {
      await addDoc(collection(db, 'comments'), {
        userId: user.uid,
        userName: user.displayName || 'User',
        userPhoto: user.photoURL,
        videoId: video.id,
        text: commentText,
        createdAt: serverTimestamp(),
      });
      setCommentText('');
    } catch (err) { console.error(err); }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-4">
        <div className={`relative aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl ${isMusicMode ? 'max-h-[300px]' : ''}`}>
          {isMusicMode && (
            <div className="absolute inset-0 z-10 bg-yt-black/80 flex flex-col items-center justify-center pointer-events-none p-10">
              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} className="bg-red-600 p-6 rounded-full mb-4">
                <Music size={48} className="text-white" />
              </motion.div>
              <p className="text-center text-xl font-bold mb-2">Music Mode Active</p>
            </div>
          )}
          <iframe
            src={`https://www.youtube.com/embed/${video.id}?autoplay=1`}
            title={video.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>

        <div className="bg-yt-dark-grey p-5 rounded-2xl">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1 mr-4">
              <h1 className="text-xl font-bold leading-tight" dangerouslySetInnerHTML={{ __html: video.title }} />
              <div className="mt-4 flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-purple-600 rounded-full" />
                  <div>
                    <p className="font-bold">{video.channelTitle}</p>
                    <p className="text-xs text-yt-light-grey">1.2M subscribers</p>
                  </div>
                  <button 
                    onClick={handleSubscribe}
                    disabled={isSubscribed}
                    className={`ml-4 px-4 py-1.5 rounded-full text-sm font-bold transition-all ${isSubscribed ? 'bg-white/10 text-yt-light-grey' : 'bg-white text-black hover:bg-white/90'}`}
                  >
                    {isSubscribed ? 'Subscribed' : 'Subscribe'}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button onClick={onMinimize} className="p-2 hover:bg-white/10 rounded-full transition-colors text-yt-light-grey hover:text-white">
                <Minimize2 size={22} />
              </button>
              <button 
                onClick={() => setShowPlaylists(!showPlaylists)}
                className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full flex items-center gap-2 transition-colors relative"
              >
                <Plus size={20} /> <span className="hidden sm:inline">Save</span>
                {showPlaylists && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute top-12 right-0 bg-yt-dark-grey border border-white/10 rounded-xl w-64 p-2 shadow-2xl z-50">
                    <p className="text-xs font-bold text-yt-light-grey px-3 py-2 uppercase tracking-widest">Save to...</p>
                    <div className="space-y-1 max-h-48 overflow-y-auto mt-2">
                      {playlists.map(p => (
                        <button key={p.id} onClick={() => onAddToPlaylist(p.id, video)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-sm flex items-center gap-2">
                          <ListPlus size={16} /> {p.name}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </button>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"> <X size={24} /> </button>
            </div>
          </div>
          
          <div className="bg-white/5 p-4 rounded-xl mb-6 hover:bg-white/10 transition-colors cursor-pointer group">
            <div className="flex items-center gap-2 text-sm font-bold mb-1">
              <span>{formatViews(video.viewCount)}</span>
              <span>•</span>
              <span>{video.publishedAt ? formatDistanceToNow(new Date(video.publishedAt), { addSuffix: true }) : ''}</span>
            </div>
            <p className="text-sm line-clamp-3 whitespace-pre-wrap group-hover:line-clamp-none transition-all">{video.description}</p>
          </div>

          {/* Comment Section */}
          <div className="mt-8 border-t border-white/10 pt-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <MessageCircle size={22} />
                <h3 className="text-lg font-bold">{video.commentCount ? parseInt(video.commentCount).toLocaleString() : '0'} Comments</h3>
              </div>
              <p className="text-xs text-yt-light-grey">{comments.length} MiniTube discussions</p>
            </div>
            
            {user && (
              <form onSubmit={postComment} className="flex gap-4 mb-8">
                <img src={user.photoURL || ''} className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                  <input 
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Comment karein..." 
                    className="w-full bg-transparent border-b border-white/20 focus:border-white py-1 outline-none transition-colors"
                  />
                  <div className="flex justify-end mt-2">
                    <button type="submit" className="bg-blue-600 px-4 py-1.5 rounded-full text-sm font-bold hover:bg-blue-700">Comment</button>
                  </div>
                </div>
              </form>
            )}

            <div className="space-y-6">
              {comments.map(c => (
                <div key={c.id} className="flex gap-4">
                  <img src={c.userPhoto} className="w-10 h-10 rounded-full bg-yt-dark-grey" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold">{c.userName}</span>
                      <span className="text-[10px] text-yt-light-grey">{c.createdAt ? formatDistanceToNow(c.createdAt.toDate(), { addSuffix: true }) : ''}</span>
                    </div>
                    <p className="text-sm">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2 no-scrollbar" onScroll={handleScroll}>
        <h2 className="text-xl font-bold sticky top-0 bg-yt-black z-10 py-2">Up Next</h2>
        <div className="space-y-3">
          {relatedVideos.map(v => (
            <div key={v.id} className="flex gap-3 group cursor-pointer" onClick={() => onVideoSelect(v)}>
              <div className="w-40 aspect-video rounded-lg overflow-hidden bg-yt-dark-grey flex-shrink-0">
                <img src={v.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold line-clamp-2 leading-snug" dangerouslySetInnerHTML={{ __html: v.title }} />
                <p className="text-xs text-yt-light-grey mt-1">{v.channelTitle}</p>
                <div className="flex items-center gap-1 text-[10px] text-yt-light-grey mt-0.5">
                  <span>{formatViews(v.viewCount)}</span>
                  {v.viewCount && v.publishedAt && <span>•</span>}
                  <span>{v.publishedAt ? formatDistanceToNow(new Date(v.publishedAt), { addSuffix: true }) : ''}</span>
                </div>
              </div>
            </div>
          ))}
          {isFetchingMore && (
            <div className="flex justify-center p-4">
              <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
