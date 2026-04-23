import React, { useState } from 'react';
import { X, Upload, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (videoData: { videoId: string; title: string; description: string }) => void;
}

export default function UploadModal({ isOpen, onClose, onUpload }: UploadModalProps) {
  const [method, setMethod] = useState<'link' | 'id'>('link');
  const [inputValue, setInputValue] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const extractVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let finalVideoId = '';
    if (method === 'link') {
      const id = extractVideoId(inputValue);
      if (!id) {
        setError('Bhai, link sahi nahi hai. Asli YouTube link dalo.');
        return;
      }
      finalVideoId = id;
    } else {
      if (inputValue.length !== 11) {
        setError('Video ID 11 characters ki hoti hai. Check karke dalo.');
        return;
      }
      finalVideoId = inputValue;
    }

    if (!title.trim()) {
      setError('Video ka naam toh likho bhaya!');
      return;
    }

    onUpload({
      videoId: finalVideoId,
      title: title.trim(),
      description: description.trim()
    });
    
    // Reset
    setInputValue('');
    setTitle('');
    setDescription('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-yt-black border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h2 className="text-xl font-bold font-hindi flex items-center gap-2">
                <Upload className="text-red-600" size={24} />
                Video Upload Karein
              </h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Method Toggle */}
              <div className="flex p-1 bg-yt-dark-grey rounded-xl">
                <button
                  type="button"
                  onClick={() => setMethod('link')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${
                    method === 'link' ? 'bg-yt-black text-white shadow-lg' : 'text-yt-light-grey hover:text-white'
                  }`}
                >
                  <LinkIcon size={16} />
                  YouTube Link
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('id')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${
                    method === 'id' ? 'bg-yt-black text-white shadow-lg' : 'text-yt-light-grey hover:text-white'
                  }`}
                >
                  <AlertCircle size={16} />
                  Video ID
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-yt-light-grey uppercase tracking-wider ml-1">
                    {method === 'link' ? 'YouTube URL Chipkao' : 'Video ID Likho'}
                  </label>
                  <input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={method === 'link' ? 'https://www.youtube.com/watch?v=...' : 'M-34S-qj7c8'}
                    className="w-full bg-yt-dark-grey border border-white/10 rounded-xl p-4 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-yt-light-grey uppercase tracking-wider ml-1">Video ka Title</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ek sexy sa title..."
                    className="w-full bg-yt-dark-grey border border-white/10 rounded-xl p-4 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-yt-light-grey uppercase tracking-wider ml-1">Description (Optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Video ke baare mein kuch kahein..."
                    rows={3}
                    className="w-full bg-yt-dark-grey border border-white/10 rounded-xl p-4 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all resize-none"
                  />
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }}
                  className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-medium flex items-center gap-2"
                >
                  <AlertCircle size={16} />
                  {error}
                </motion.div>
              )}

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-4 text-sm font-bold border border-white/10 rounded-2xl hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 text-sm font-bold bg-red-600 rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 transform active:scale-95"
                >
                  Upload Karein
                </button>
              </div>
            </form>
            
            <div className="bg-yt-dark-grey p-4 text-[10px] text-center text-yt-light-grey uppercase tracking-tighter">
              Aapka uploaded video "Dali Hui" (Uploaded) category mein dikhega
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
