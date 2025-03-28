FROM node:18 AS builder_npm_web

WORKDIR /build/web
COPY web .
RUN npm ci

RUN npm run build

FROM node:18 as builder_npm_api

# Copy and prepare backend
WORKDIR /build/api
COPY api .
RUN npm ci

# Compile TypeScript to JavaScript
RUN npm run build

FROM node:18

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

EXPOSE 3000
EXPOSE 3600

# Create necessary directories
RUN mkdir -p /app/backend /app/frontend /app/data

COPY api/prisma /app/backend/prisma

# Install Prisma CLI globally
RUN npm install -g prisma

#we need prisma migration
WORKDIR /app/backend

# Generate Prisma client
RUN prisma generate

# Install serve for frontend
RUN npm install -g serve

# Copy frontend and backend build artifacts
COPY --from=builder_npm_web /build/web/dist /app/frontend
COPY --from=builder_npm_api /build/api/dist /app/backend

# Copy startup script
COPY actionfiles/aquafier-ts/script/start_aqua.sh /app/start_aqua.sh
RUN chmod +x /app/start_aqua.sh

WORKDIR /app
CMD ["./start_aqua.sh"]