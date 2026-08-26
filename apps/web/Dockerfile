# --- Stage 1: Build ---
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci --workspace=@agenda/web

# Copy source and build
COPY tsconfig.base.json ./
COPY apps/web/ ./apps/web/
COPY packages/shared/ ./packages/shared/

# Safety: remove any .env files that might have leaked into the context
RUN rm -f apps/web/.env apps/web/.env.local apps/web/.env.development apps/web/.env.production

RUN npm run build --workspace=@agenda/web

# --- Stage 2: Serve with Nginx ---
FROM nginx:alpine AS runner

# Copy built assets
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy nginx config
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -sf http://localhost:80/ || wget -qO- http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
