FROM node:20-slim

WORKDIR /app

# Install native compilation dependencies for argon2 and network utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy root and all workspace manifests so npm ci can resolve workspaces
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Clean install backend production dependencies
RUN npm ci --workspace=backend --omit=dev

# Copy backend source code
COPY backend/ ./backend/

WORKDIR /app/backend

EXPOSE 5000

ENV NODE_ENV=production

CMD ["node", "src/server.js"]
