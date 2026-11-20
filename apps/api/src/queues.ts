import { Queue, QueueEvents } from "bullmq";
import { config } from "./config.js";

const connection = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: null,
};

export const ingestQueue = new Queue("ingest", { prefix: "docint", connection });
export const revalidateQueue = new Queue("revalidate", { prefix: "docint", connection });
export const revalidateQueueEvents = new QueueEvents("revalidate", { prefix: "docint", connection });
