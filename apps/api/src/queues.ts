import { Queue, QueueEvents, ConnectionOptions } from "bullmq";
import { config } from "./config.js";

const connection: ConnectionOptions = config.redis.url
  ? {
      url: config.redis.url,
      maxRetriesPerRequest: null,
      ...(config.redis.tls ? { tls: { rejectUnauthorized: false } } : {}),
    }
  : {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      maxRetriesPerRequest: null,
    };

export const ingestQueue = new Queue("ingest", {
  prefix: "docint",
  connection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export const revalidateQueue = new Queue("revalidate", {
  prefix: "docint",
  connection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export const revalidateQueueEvents = new QueueEvents("revalidate", {
  prefix: "docint",
  connection,
});
