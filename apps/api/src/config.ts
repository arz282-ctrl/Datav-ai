import dotenv from "dotenv";
dotenv.config();

const databaseUrl = process.env.DATABASE_URL || "";
const isPostgresSsl =
  process.env.POSTGRES_SSL === "true" ||
  process.env.POSTGRES_SSL === "1" ||
  databaseUrl.includes("sslmode=require") ||
  databaseUrl.includes("ssl=true") ||
  databaseUrl.includes("neon.tech");

const redisUrl = process.env.REDIS_URL || "";
const isRedisTls =
  redisUrl.startsWith("rediss://") ||
  process.env.REDIS_TLS === "true" ||
  process.env.REDIS_TLS === "1";

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  apiKey: process.env.API_KEY || "docintel-test-api-key-2026-secure-token",
  maxUploadMb: parseInt(process.env.MAX_UPLOAD_MB || "200", 10),
  dataUploadsDir: process.env.DATA_UPLOADS_DIR || "/data/uploads",
  workerInternalUrl: process.env.WORKER_INTERNAL_URL || "http://worker:8001",
  corsOrigins: process.env.CORS_ORIGINS || "",
  autoMigrate: process.env.AUTO_MIGRATE === "true" || Boolean(databaseUrl),
  postgres: {
    url: databaseUrl,
    ssl: isPostgresSsl,
    host: process.env.POSTGRES_HOST || "localhost",
    port: parseInt(process.env.POSTGRES_PORT || "5432", 10),
    database: process.env.POSTGRES_DB || "docintel",
    user: process.env.POSTGRES_USER || "docintel_user",
    password: process.env.POSTGRES_PASSWORD || "docintel_password_change_me",
  },
  redis: {
    url: redisUrl,
    tls: isRedisTls,
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || "redis_password_change_me",
  },
};
