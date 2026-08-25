FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY backend/package*.json ./backend/

RUN npm ci --workspace=backend --omit=dev

COPY backend/ ./backend/

WORKDIR /app/backend

EXPOSE 5000

ENV NODE_ENV=production

CMD ["node", "src/server.js"]
