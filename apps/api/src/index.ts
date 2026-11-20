import express, { Request, Response } from "express";
import { config } from "./config.js";
import { checkDbHealth } from "./db.js";
import {
  authenticateApiKey,
  corsMiddleware,
  generalRateLimiter,
  securityHeaders,
} from "./middleware/security.js";
import documentsRouter from "./routes/documents.js";

const app = express();

// Security middlewares
app.use(securityHeaders);
app.use(corsMiddleware);
app.use(generalRateLimiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (checks postgres and redis)
app.get("/health", async (_req: Request, res: Response) => {
  const health = await checkDbHealth();
  const isHealthy = health.postgres && health.redis;
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "ok" : "degraded",
    services: health,
    timestamp: new Date().toISOString(),
  });
});

// Protected Document API routes
app.use("/api/documents", authenticateApiKey, documentsRouter);

if (process.env.NODE_ENV !== "test") {
  app.listen(config.port, () => {
    console.log(`AI Document Intelligence API listening on port ${config.port}`);
  });
}

export default app;
