# Free 24/7 Cloud Hosting Deployment Guide (Vercel + Modal + Neon + Upstash)

This guide documents how to deploy **Datav-ai** so the complete system runs 24/7 on free tier cloud providers with **zero local hardware dependencies** and **$0/month infrastructure cost**.

| Tier | Provider | Service / Role | Free Tier Specifications |
|---|---|---|---|
| **Frontend** | [Vercel](https://vercel.com) | Next.js 15 Web Dashboard (`apps/web`) | Unlimited deployments, global edge network |
| **Backend & OCR** | [Modal](https://modal.com) | Serverless Express API & FastAPI Worker (`modal_docintel.py`) | $30/mo free compute credit, scale-to-zero |
| **Database** | [Neon](https://neon.tech) | PostgreSQL 16 + `pgvector` (`DATABASE_URL`) | 0.5 GB storage, autoscaling compute |
| **Queues & Cache** | [Upstash](https://upstash.com) | Redis 7 + TLS (`REDIS_URL`) | 10,000 commands/day free, 256MB storage |

---

## Step 1: PostgreSQL + pgvector on Neon

1. Create a free account at [neon.tech](https://neon.tech) and create a new project (e.g. `datav-ai`).
2. Copy the connection string with SSL required:
   ```
   postgresql://[user]:[password]@[endpoint].neon.tech/neondb?sslmode=require
   ```
3. Run the idempotent schema migration against your Neon database from your local terminal:
   ```bash
   cd apps/api
   DATABASE_URL="postgresql://[user]:[password]@[endpoint].neon.tech/neondb?sslmode=require" npm run db:init
   ```
   *Note: This automatically creates the `uuid-ossp` and `vector` extensions along with all tables, indexes, and triggers.*

---

## Step 2: Redis on Upstash

1. Create a free account at [upstash.com](https://upstash.com).
2. Create a new Redis Database (choose the region closest to your Neon and Modal regions, e.g. `us-east-1`).
3. Under the **Connect** tab, select **Node (ioredis)** or **Redis CLI** and copy the `rediss://` TLS connection URL:
   ```
   rediss://default:[password]@[endpoint].upstash.io:6379
   ```

---

## Step 3: Configure Modal Secret (`DocIntel-AI`)

Modal injects production environment variables securely via Secrets into serverless containers.

1. Ensure the Modal CLI is authenticated:
   ```bash
   modal token new
   ```
2. Create or update the secret named `DocIntel-AI` via the Modal web dashboard or terminal:
   ```bash
   modal secret create DocIntel-AI \
     DATABASE_URL="postgresql://[user]:[password]@[endpoint].neon.tech/neondb?sslmode=require" \
     REDIS_URL="rediss://default:[password]@[endpoint].upstash.io:6379" \
     GEMINI_API_KEY="your-gemini-api-key" \
     API_KEY="docintel-test-api-key-2026-secure-token" \
     CORS_ORIGINS="https://datav-ai.vercel.app"
   ```

---

## Step 4: Deploy Backend to Modal

Deploy both permanent serverless web endpoints (`worker` and `api`):

```bash
modal deploy modal_docintel.py
```

Modal will output two permanent HTTPS endpoints:
- Worker FastAPI: `https://[workspace]--datav-ai-backend-worker.modal.run`
- Express REST API: `https://[workspace]--datav-ai-backend-api.modal.run`

> **Note on Worker URL:** If you want the API to mirror uploads directly to the worker via HTTP, set `WORKER_INTERNAL_URL` in your `DocIntel-AI` secret to `https://[workspace]--datav-ai-backend-worker.modal.run` and re-run `modal deploy modal_docintel.py`.

### Verify Modal Deployment Health:
```bash
curl -fsSL https://[workspace]--datav-ai-backend-api.modal.run/health
```
Expected response:
```json
{"status":"ok","services":{"postgres":true,"redis":true},"timestamp":"..."}
```

---

## Step 5: Update Vercel Frontend (`apps/web`)

1. Open your Vercel Dashboard for `datav-ai` at [vercel.com](https://vercel.com).
2. Go to **Settings** -> **Environment Variables**.
3. Add / update:
   - `API_INTERNAL_URL`: `https://[workspace]--datav-ai-backend-api.modal.run`
   - `API_KEY`: `docintel-test-api-key-2026-secure-token` (matching your Modal secret)
4. Trigger a **Redeploy** on Vercel.

Your frontend at `https://datav-ai.vercel.app` is now fully connected to your 24/7 cloud backend!
