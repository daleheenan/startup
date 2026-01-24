# NovelForge Backend Dockerfile
# NOTE: Requires shared folder to be copied to backend/shared before build
# Railway: Set root directory to "" (repo root) and use Dockerfile.backend instead

FROM node:20-slim

# Install build dependencies for better-sqlite3 and curl for healthcheck
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (need devDeps for TypeScript build)
RUN npm ci

# Copy source code and shared types
COPY . .

# Build TypeScript (expects shared folder to exist at ../shared relative to backend)
RUN npm run build

# Remove devDependencies after build to reduce image size
RUN npm prune --production

# Create data directory for SQLite
RUN mkdir -p /data

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Start server
CMD ["npm", "start"]
