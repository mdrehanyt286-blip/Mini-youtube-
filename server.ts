import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getApiKey = () => process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY;

// Simple in-memory cache to save quota
const cache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const handleYoutubeError = (error: any, res: any, context: string) => {
  const errorData = error.response?.data?.error;
  
  if (errorData) {
    const apiMsg = errorData.message || "Unknown YouTube error";
    const errors = errorData.errors || [];
    const reason = errors[0]?.reason || "unknown";
    
    console.error(`YouTube ${context} [${reason}]:`, apiMsg);
    
    let userFriendlyMsg = apiMsg;
    if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') {
      userFriendlyMsg = "YouTube API Quota Limit Khatam (Daily Limit reached). Reset hone tak intezar karein ya apni API Key check karein.";
    } else if (reason === 'keyInvalid') {
      userFriendlyMsg = "Invalid API Key. Please update your YOUTUBE_API_KEY in Secrets.";
    } else if (reason === 'rateLimitExceeded') {
      userFriendlyMsg = "Rate limit hit. Thoda ruk kar try karein.";
    } else if (reason === 'accessNotConfigured') {
      userFriendlyMsg = "YouTube Data API v3 enable nahi hai aapke Google Cloud Console mein.";
    }

    res.status(error.response.status || 500).json({ 
      error: `Failed during ${context}`, 
      detail: userFriendlyMsg,
      code: errorData.code,
      reason: reason
    });
  } else {
    console.error(`YouTube ${context} Network Error:`, error.message);
    res.status(500).json({ 
      error: `Failed during ${context}`, 
      detail: "Hawa mein problem hai! Network check karo." 
    });
  }
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Server is running" });
  });

  // YouTube API Proxy
  app.get("/api/videos/search", async (req, res) => {
    const { q, maxResults = 12, pageToken } = req.query;
    const apiKey = getApiKey();

    if (!apiKey || apiKey === "YOUR_YOUTUBE_API_KEY") {
      return res.status(500).json({ 
        error: "YouTube API Key is missing. Please add YOUTUBE_API_KEY to your Secrets." 
      });
    }

    const cacheKey = `search-${q}-${maxResults}-${pageToken}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json(cached.data);
    }

    try {
      const searchRes = await axios.get("https://www.googleapis.com/youtube/v3/search", {
        params: {
          part: "snippet",
          q,
          type: "video",
          maxResults,
          pageToken,
          key: apiKey,
          videoEmbeddable: "true",
          safeSearch: "none",
        },
      });

      const videoIds = searchRes.data.items.map((item: any) => item.id.videoId).filter(Boolean).join(",");
      
      if (videoIds) {
        const statsRes = await axios.get("https://www.googleapis.com/youtube/v3/videos", {
          params: {
            part: "statistics,contentDetails",
            id: videoIds,
            key: apiKey,
          },
        });

        const statsMap = statsRes.data.items.reduce((acc: any, item: any) => {
          acc[item.id] = item.statistics;
          return acc;
        }, {});

        searchRes.data.items = searchRes.data.items.map((item: any) => {
          if (item.id.videoId && statsMap[item.id.videoId]) {
            item.statistics = statsMap[item.id.videoId];
          }
          return item;
        });
      }

      cache.set(cacheKey, { data: searchRes.data, timestamp: Date.now() });
      res.json(searchRes.data);
    } catch (error: any) {
      handleYoutubeError(error, res, "Search");
    }
  });

  app.get("/api/videos/related", async (req, res) => {
    const { videoId, pageToken } = req.query;
    const apiKey = getApiKey();

    if (!apiKey) return res.status(500).json({ error: "API Key missing" });

    const cacheKey = `related-${videoId}-${pageToken}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json(cached.data);
    }

    try {
      let searchData;
      try {
        const response = await axios.get("https://www.googleapis.com/youtube/v3/search", {
          params: {
            part: "snippet",
            relatedToVideoId: videoId,
            type: "video",
            maxResults: 15,
            pageToken,
            key: apiKey,
            safeSearch: "none",
          },
        });
        searchData = response.data;
      } catch (e) {
        const videoDetail = await axios.get("https://www.googleapis.com/youtube/v3/videos", {
          params: { part: "snippet", id: videoId, key: apiKey }
        });
        
        const title = videoDetail.data.items[0]?.snippet?.title || "";
        const cleanTitle = title.replace(/official|video|audio|hd|4k|music|lyric/gi, "").trim();
        
        const response = await axios.get("https://www.googleapis.com/youtube/v3/search", {
          params: {
            part: "snippet",
            q: cleanTitle,
            type: "video",
            maxResults: 15,
            pageToken,
            key: apiKey,
            safeSearch: "none",
          },
        });
        searchData = response.data;
      }

      const videoIds = searchData.items.map((item: any) => item.id.videoId).filter(Boolean).join(",");
      if (videoIds) {
        const statsRes = await axios.get("https://www.googleapis.com/youtube/v3/videos", {
          params: { part: "statistics", id: videoIds, key: apiKey },
        });
        const statsMap = statsRes.data.items.reduce((acc: any, item: any) => {
          acc[item.id] = item.statistics;
          return acc;
        }, {});
        searchData.items = searchData.items.map((item: any) => {
          if (item.id.videoId && statsMap[item.id.videoId]) {
            item.statistics = statsMap[item.id.videoId];
          }
          return item;
        });
      }
      cache.set(cacheKey, { data: searchData, timestamp: Date.now() });
      res.json(searchData);
    } catch (error: any) {
      handleYoutubeError(error, res, "RelatedVideos");
    }
  });

  app.get("/api/videos/trending", async (req, res) => {
    const { pageToken } = req.query;
    const apiKey = getApiKey();
    if (!apiKey) return res.status(500).json({ error: "YOUTUBE_API_KEY is not configured" });

    const cacheKey = `trending-${pageToken}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json(cached.data);
    }

    try {
      const response = await axios.get("https://www.googleapis.com/youtube/v3/videos", {
        params: {
          part: "snippet,contentDetails,statistics",
          chart: "mostPopular",
          regionCode: "IN",
          maxResults: 12,
          pageToken,
          key: apiKey,
        },
      });
      cache.set(cacheKey, { data: response.data, timestamp: Date.now() });
      res.json(response.data);
    } catch (error: any) {
      handleYoutubeError(error, res, "Trending");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
