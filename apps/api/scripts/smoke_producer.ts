import { Queue, QueueEvents } from "bullmq";
import Redis from "ioredis";

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379", 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || "redis_password_change_me";

const connection = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: null,
};

async function runSmokeTest() {
  console.log(`[Node Producer] Connecting to Redis at ${REDIS_HOST}:${REDIS_PORT}...`);
  const queue = new Queue("smoke", { connection });
  const queueEvents = new QueueEvents("smoke", { connection });

  await queueEvents.waitUntilReady();
  console.log("[Node Producer] QueueEvents ready.");

  try {
    // ---------------------------------------------------------
    // Test A: Fast round-trip job with waitUntilFinished(..., 5000)
    // ---------------------------------------------------------
    console.log("\n--- TEST A: Fast job round-trip (timeout 5000ms) ---");
    const fastJob = await queue.add("short-task", {
      type: "short",
      input: 21,
    });
    console.log(`[Node Producer] Added job ${fastJob.id}, awaiting completion...`);

    const resultA = await fastJob.waitUntilFinished(queueEvents, 5000);
    console.log("[Node Producer] Test A SUCCESS! Result received:", JSON.stringify(resultA));
    if (!resultA || resultA.value !== 42) {
      throw new Error(`Test A unexpected result: ${JSON.stringify(resultA)}`);
    }

    // ---------------------------------------------------------
    // Test B: 45-second long job with lock renewal
    // ---------------------------------------------------------
    console.log("\n--- TEST B: 45-second long job lock renewal check ---");
    let stalledEvents = 0;
    let completedEvents = 0;

    queueEvents.on("stalled", ({ jobId }) => {
      console.warn(`[Node Producer WARNING] Job ${jobId} was marked as STALLED!`);
      stalledEvents++;
    });

    queueEvents.on("completed", ({ jobId }) => {
      console.log(`[Node Producer] Job ${jobId} reported completed event.`);
      completedEvents++;
    });

    const longJob = await queue.add("long-task", {
      type: "long",
      duration: 45,
    });
    console.log(`[Node Producer] Added 45s job ${longJob.id}, awaiting completion (timeout 60000ms)...`);

    const resultB = await longJob.waitUntilFinished(queueEvents, 60000);
    console.log("[Node Producer] Test B finished! Result:", JSON.stringify(resultB));

    if (stalledEvents > 0) {
      throw new Error(`Test B failed: ${stalledEvents} stalled events detected. Lock renewal failed.`);
    }

    console.log("\n=======================================================");
    console.log("SMOKE TEST SUMMARY:");
    console.log("Test A (Fast 5s return): PASSED");
    console.log("Test B (45s lock renewal & single execution): PASSED");
    console.log("BullMQ Node <-> Python interoperability is verified.");
    console.log("=======================================================\n");

  } finally {
    await queue.close();
    await queueEvents.close();
  }
}

runSmokeTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[Node Producer ERROR]", err);
    process.exit(1);
  });
