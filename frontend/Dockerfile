FROM node:20-slim AS builder

WORKDIR /app

# Copy root and all workspace manifests so npm ci can resolve workspaces
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Clean install frontend dependencies (including Vite and plugins for build)
RUN npm ci --workspace=frontend

# Copy frontend source code
COPY frontend/ ./frontend/

WORKDIR /app/frontend

# Build production bundle
RUN npm run build

# Nginx web server
FROM nginx:alpine

# Copy built distribution files to Nginx webroot
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Copy Nginx proxy configuration
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
