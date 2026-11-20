import { Pool } from "pg";
import Redis from "ioredis";
import { config } from "./config.js";

export const pgPool = new Pool({
  host: config.postgres.host,
  port: config.postgres.port,
  database: config.postgres.database,
  user: config.postgres.user,
  password: config.postgres.password,
  max: 20,
  idleTimeoutMillis: 30000,
});

export const redisClient = new Redis({
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
