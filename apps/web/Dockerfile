FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci || npm install

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build || true

FROM node:20-alpine AS runner

# Fixed non-root user UID/GID 10001
RUN addgroup -g 10001 appgroup && \
    adduser -u 10001 -G appgroup -s /bin/sh -D appuser

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Copy standalone output or fallback
COPY --from=builder /app ./

RUN chown -R 10001:10001 /app

USER 10001:10001

EXPOSE 3000

HEALTHCHECK --interval=5s --timeout=5s --retries=5 --start-period=10s \
  CMD node -e 'require("http").get("http://localhost:3000/api/health", (r) => process.exit(r.statusCode === 200 ? 0 : 1))' || exit 1

CMD ["sh", "-c", "if [ -f .next/standalone/server.js ]; then node .next/standalone/server.js; elif [ -f .next/standalone/apps/web/server.js ]; then node .next/standalone/apps/web/server.js; elif [ -f server.js ]; then node server.js; else npm start; fi"]
