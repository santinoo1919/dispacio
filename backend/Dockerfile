# Production Dockerfile for Fastify Backend
# Using full Node image for native module compilation
FROM node:20-bookworm-slim

# Install build dependencies for native modules (node_or_tools)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    wget \
    curl \
    git \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Remove dev dependencies after build
RUN npm prune --production

# Expose port (Railway sets PORT env var)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health/live || exit 1

# Start server
CMD ["node", "server.js"]
