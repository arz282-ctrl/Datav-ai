import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";
import { config } from "../config.js";

// Constant-time timingSafeEqual authentication check
export function authenticateApiKey(req: Request, res: Response, next: NextFunction): void {
  const incomingKey = req.header("X-API-Key");
  if (!incomingKey) {
    res.status(401).json({ error: "Missing required X-API-Key header" });
    return;
  }

  const expectedKey = config.apiKey;
  const incomingBuffer = Buffer.from(incomingKey, "utf-8");
  const expectedBuffer = Buffer.from(expectedKey, "utf-8");

  if (incomingBuffer.length !== expectedBuffer.length) {
    res.status(401).json({ error: "Invalid API key" });
    return;
  }

  const matches = crypto.timingSafeEqual(incomingBuffer, expectedBuffer);
  if (!matches) {
    res.status(401).json({ error: "Invalid API key" });
    return;
  }

  next();
}

export const securityHeaders = helmet({
  contentSecurityPolicy: true,
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow local development, docker internal, and empty origin (server-to-server)
    if (!origin || /^http:\/\/(localhost|127\.0\.0\.1|web)(:[0-9]+)?$/.test(origin) || /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed for this origin"));
    }
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "X-API-Key", "Authorization"],
});

export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Upload rate limit exceeded. Max 20 uploads per minute." },
});
