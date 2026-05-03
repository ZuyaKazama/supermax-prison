# =============================================
# SIPENJARA - Multi-stage Docker Build
# =============================================

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production Server
FROM node:20-alpine AS production
WORKDIR /app

# Copy backend files
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

COPY backend/server.js ./
COPY backend/sipenjara.db ./

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/backend/dist ./dist

EXPOSE ${PORT:-3001}

ENV NODE_ENV=production

CMD ["node", "server.js"]
