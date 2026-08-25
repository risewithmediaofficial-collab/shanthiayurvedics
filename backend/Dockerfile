FROM node:20-alpine

WORKDIR /app

# Install build dependencies for native addons like argon2
RUN apk add --no-cache python3 make g++

COPY package*.json ./
COPY backend/package*.json ./backend/

RUN npm ci --workspace=backend --omit=dev

COPY backend/ ./backend/

WORKDIR /app/backend

EXPOSE 5000

ENV NODE_ENV=production

CMD ["node", "src/server.js"]
