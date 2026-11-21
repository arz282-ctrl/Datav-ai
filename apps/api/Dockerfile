FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:20-alpine AS runner

# Fixed non-root user UID/GID 10001
RUN addgroup -g 10001 appgroup && \
    adduser -u 10001 -G appgroup -s /bin/sh -D appuser

# Create shared data uploads directory
RUN mkdir -p /data/uploads && chown -R 10001:10001 /data/uploads

WORKDIR /app

COPY --from=builder --chown=10001:10001 /app/package*.json ./
COPY --from=builder --chown=10001:10001 /app/node_modules ./node_modules
COPY --from=builder --chown=10001:10001 /app/dist ./dist

USER 10001:10001

EXPOSE 4000

HEALTHCHECK --interval=5s --timeout=5s --retries=5 --start-period=5s \
  CMD node -e 'require("http").get("http://localhost:4000/health", (r) => process.exit(r.statusCode === 200 ? 0 : 1))' || exit 1

CMD ["node", "dist/index.js"]
