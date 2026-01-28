# Production Dockerfile for Node.js Express on Railway
# Optimised for better-sqlite3 and similar native dependencies

FROM node:20-slim

# Install build dependencies for native modules
# python3, make, g++ required for better-sqlite3
# curl required for health checks
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Create data directory for SQLite persistence
RUN mkdir -p /data

EXPOSE 3001

# Health check configuration
# CRITICAL: start-period must allow for database migrations
# - interval: How often to check (30s is reasonable)
# - timeout: Max time for health check request (10s)
# - start-period: Grace period before checks count (120s for migrations)
# - retries: Failures before marking unhealthy (3)
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:3001/api/health || exit 1

CMD ["npm", "start"]
