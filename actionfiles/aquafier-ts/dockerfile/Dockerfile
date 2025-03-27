FROM node:18 AS builder_npm_web

WORKDIR /build/web
COPY web .
RUN npm ci

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

# Copy and prepare backend
WORKDIR /app/backend
COPY api .
RUN npm ci

# Install Prisma CLI globally
RUN npm install -g prisma

# Generate Prisma client
RUN prisma generate

# Compile TypeScript to JavaScript
RUN npm run build

# Copy frontend build artifacts
WORKDIR /app/frontend
COPY --from=builder_npm_web /build/web/dist .

# Install serve for frontend
RUN npm install -g serve

# Copy startup script
COPY actionfiles/aquafier-ts/script/start_aqua.sh /app/start_aqua.sh
RUN chmod +x /app/start_aqua.sh

WORKDIR /app
CMD ["./start_aqua.sh"]