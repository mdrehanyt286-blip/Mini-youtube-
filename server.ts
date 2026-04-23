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
    const apiKey = process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY;

    if (!apiKey || apiKey === "YOUR_YOUTUBE_API_KEY") {
      return res.status(500).json({ 
        error: "YouTube API Key is missing. Please add YOUTUBE_API_KEY to your Secrets." 
      });
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

      res.json(searchRes.data);
    } catch (error: any) {
      console.error("YouTube Search Error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to fetch videos from YouTube" });
    }
  });

  app.get("/api/videos/related", async (req, res) => {
    const { videoId, pageToken } = req.query;
    const apiKey = process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY;

    if (!apiKey) return res.status(500).json({ error: "API Key missing" });

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
      res.json(searchData);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch related videos" });
    }
  });

  app.get("/api/videos/trending", async (req, res) => {
    const { pageToken } = req.query;
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "YOUTUBE_API_KEY is not configured" });

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
      res.json(response.data);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch trending videos" });
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
