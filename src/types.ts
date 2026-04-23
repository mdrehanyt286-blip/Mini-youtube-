export interface Video {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  description: string;
  publishedAt: string;
  viewCount?: string;
  commentCount?: string;
}

export interface Playlist {
  id: string;
  userId: string;
  name: string;
  videos: Video[];
  createdAt: any;
  updatedAt: any;
}

export interface HistoryItem {
  id: string;
  userId: string;
  videoId: string;
  title: string;
  thumbnail: string;
  watchedAt: any;
}
