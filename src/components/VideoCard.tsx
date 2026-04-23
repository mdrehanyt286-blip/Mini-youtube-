import React from 'react';
import { Video } from '../types';
import { formatDistanceToNow } from 'date-fns';

interface VideoCardProps {
  video: Video;
  onClick: () => void;
}

const formatViews = (views?: string) => {
  if (!views) return '';
  const n = parseInt(views);
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M views';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K views';
  return n + ' views';
};

export default function VideoCard({ video, onClick }: VideoCardProps) {
  return (
    <div 
      className="flex flex-col gap-3 cursor-pointer group"
      onClick={onClick}
    >
      <div className="relative aspect-video rounded-xl overflow-hidden bg-yt-dark-grey">
        <img 
          src={video.thumbnail} 
          alt={video.title}
          className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="flex gap-3 px-1">
        <div className="flex-1">
          <h3 className="font-bold text-sm leading-tight line-clamp-2 group-hover:text-yt-light-grey transition-colors" dangerouslySetInnerHTML={{ __html: video.title }} />
          <div className="mt-1 text-xs text-yt-light-grey">
            <p className="hover:text-white transition-colors">{video.channelTitle}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span>{formatViews(video.viewCount)}</span>
              {video.viewCount && video.publishedAt && <span>•</span>}
              <span>{video.publishedAt ? formatDistanceToNow(new Date(video.publishedAt), { addSuffix: true }) : ''}</span>
              {video.commentCount && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-0.5">
                    {parseInt(video.commentCount).toLocaleString()} comments
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
