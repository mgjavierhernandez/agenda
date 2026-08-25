# --- Stage 1: Build ---
FROM node:20-alpine AS builder
WORKDIR /app

# Install build dependencies for native modules (argon2)
RUN apk add --no-cache python3 make g++

# Install dependencies
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci

# Copy source and generate Prisma client, then build
COPY apps/api/ ./apps/api/
COPY packages/shared/ ./packages/shared/
RUN npx prisma generate --schema=./apps/api/prisma/schema.prisma
RUN npm run build --workspace=@agenda/api

# --- Stage 2: Production ---
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl curl

# Run as non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Copy built app and production dependencies
COPY --from=builder --chown=appuser:appgroup /app/apps/api/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/apps/api/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/apps/api/package.json ./
COPY --from=builder --chown=appuser:appgroup /app/apps/api/prisma ./prisma

# Create storage directory for file uploads
RUN mkdir -p /app/storage && chown appuser:appgroup /app/storage

USER appuser

ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1

CMD ["node", "dist/main.js"]
