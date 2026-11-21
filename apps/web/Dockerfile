FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner

RUN addgroup -g 10001 appgroup && \
    adduser -u 10001 -G appgroup -s /bin/sh -D appuser

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

COPY --from=builder --chown=10001:10001 /app/package*.json ./
COPY --from=builder --chown=10001:10001 /app/node_modules ./node_modules
COPY --from=builder --chown=10001:10001 /app/.next ./.next

USER 10001:10001

EXPOSE 3000

HEALTHCHECK --interval=5s --timeout=5s --retries=5 --start-period=10s \
  CMD node -e 'require("http").get("http://localhost:3000/api/health", (r) => process.exit(r.statusCode === 200 ? 0 : 1))' || exit 1

CMD ["npm", "start"]
