import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  apiKey: process.env.API_KEY || "docintel-test-api-key-2026-secure-token",
  maxUploadMb: parseInt(process.env.MAX_UPLOAD_MB || "200", 10),
  dataUploadsDir: process.env.DATA_UPLOADS_DIR || "/data/uploads",
  workerInternalUrl: process.env.WORKER_INTERNAL_URL || "http://worker:8001",
  postgres: {
    host: process.env.POSTGRES_HOST || "localhost",
    port: parseInt(process.env.POSTGRES_PORT || "5432", 10),
    database: process.env.POSTGRES_DB || "docintel",
    user: process.env.POSTGRES_USER || "docintel_user",
    password: process.env.POSTGRES_PASSWORD || "docintel_password_change_me",
  },
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || "redis_password_change_me",
  },
};
