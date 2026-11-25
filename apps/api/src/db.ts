import { Pool, PoolConfig } from "pg";
import { Redis } from "ioredis";
import fs from "fs";
import path from "path";
import { config } from "./config.js";

const poolConfig: PoolConfig = config.postgres.url
  ? {
      connectionString: config.postgres.url,
      ssl: config.postgres.ssl ? { rejectUnauthorized: false } : undefined,
      max: 20,
      idleTimeoutMillis: 30000,
    }
  : {
      host: config.postgres.host,
      port: config.postgres.port,
      database: config.postgres.database,
      user: config.postgres.user,
      password: config.postgres.password,
      ssl: config.postgres.ssl ? { rejectUnauthorized: false } : undefined,
      max: 20,
      idleTimeoutMillis: 30000,
    };

export const pgPool = new Pool(poolConfig);

export const redisClient = config.redis.url
  ? new Redis(config.redis.url, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      ...(config.redis.tls ? { tls: { rejectUnauthorized: false } } : {}),
    })
  : new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });

export async function checkDbHealth(): Promise<{ postgres: boolean; redis: boolean }> {
  let postgres = false;
  let redis = false;

  try {
    const res = await pgPool.query("SELECT 1");
    postgres = res.rows.length > 0;
  } catch (err) {
    postgres = false;
  }

  try {
    if (redisClient.status !== "ready") {
      await redisClient.connect();
    }
    const pong = await redisClient.ping();
    redis = pong === "PONG";
  } catch (err) {
    redis = false;
  }

  return { postgres, redis };
}

export async function runDbInit(): Promise<void> {
  const possiblePaths = [
    path.resolve(process.cwd(), "db/init.sql"),
    path.resolve(process.cwd(), "../db/init.sql"),
    path.resolve(process.cwd(), "../../db/init.sql"),
    path.resolve(process.cwd(), "init.sql"),
    "/root/db/init.sql",
    "/app/db/init.sql",
  ];

  const sqlPath = possiblePaths.find((p) => fs.existsSync(p));
  if (!sqlPath) {
    console.warn("[DB Init] init.sql not found at standard search paths. Skipping schema init.");
    return;
  }

  console.log(`[DB Init] Initializing database schema from ${sqlPath}...`);
  const sql = fs.readFileSync(sqlPath, "utf-8");
  await pgPool.query(sql);
  console.log("[DB Init] Database schema initialization completed successfully.");
}
