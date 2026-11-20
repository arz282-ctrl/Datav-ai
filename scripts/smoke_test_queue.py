"""Smoke test consumer for BullMQ in Python.
Listens on queue 'smoke' and handles two types of jobs:
1. Short job: immediately computes and returns a result dict: {"status": "ok", "value": data.get("input") * 2}
2. Long job (45 seconds): sleeps for 45s while ensuring lock is held, returning {"status": "long_completed", "elapsed": 45}
"""

import asyncio
import os
import sys
import time
from bullmq import Worker, Job

REDIS_HOST = os.environ.get("REDIS_HOST", "localhost")
REDIS_PORT = int(os.environ.get("REDIS_PORT", "6379"))
REDIS_PASSWORD = os.environ.get("REDIS_PASSWORD", "redis_password_change_me")

redis_opts = {
    "host": REDIS_HOST,
    "port": REDIS_PORT,
    "password": REDIS_PASSWORD,
}

processed_jobs = []

async def process_job(job: Job, token: str):
    data = job.data
    job_type = data.get("type", "short")
    job_id = job.id
    print(f"[Python Worker] Received job {job_id} of type '{job_type}' with data: {data}")
    processed_jobs.append(job_id)

    if job_type == "short":
        inp = data.get("input", 21)
        return {"status": "ok", "value": inp * 2, "jobId": job_id}
    elif job_type == "long":
        duration = data.get("duration", 45)
        print(f"[Python Worker] Starting long job {job_id} for {duration} seconds...")
        # Periodically update progress or heartbeat
        start = time.time()
        for i in range(duration):
            await asyncio.sleep(1)
            if (i + 1) % 10 == 0:
                print(f"[Python Worker] Long job {job_id} running... {i + 1}/{duration}s")
        elapsed = round(time.time() - start, 2)
        print(f"[Python Worker] Completed long job {job_id} in {elapsed}s")
        return {"status": "long_completed", "elapsed": elapsed, "jobId": job_id}
    else:
        return {"status": "unknown_type"}

async def main():
    print(f"[Python Worker] Connecting to Redis at {REDIS_HOST}:{REDIS_PORT}...")
    # lockDuration is 30_000ms by default; Worker in bullmq automatically renews locks
    worker = Worker("smoke", process_job, {
        "connection": redis_opts,
        "concurrency": 2,
        "lockDuration": 30000,
    })

    print("[Python Worker] Worker listening on 'smoke' queue. Press Ctrl+C to stop.")
    try:
        # Run until stopped or signal
        while True:
            await asyncio.sleep(1)
    except (asyncio.CancelledError, KeyboardInterrupt):
        pass
    finally:
        await worker.close()
        print(f"[Python Worker] Worker closed. Total processed jobs: {len(processed_jobs)}")

if __name__ == "__main__":
    asyncio.run(main())
