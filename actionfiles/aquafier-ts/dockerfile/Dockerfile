FROM node:18 as builder_npm_web

WORKDIR /build/web
COPY web/package*.json ./
RUN npm ci

COPY web .
RUN npm run build

FROM node:18

EXPOSE 3000
EXPOSE 3600

WORKDIR /app

# Create necessary directories
RUN mkdir -p /app/backend /app/frontend /app/data

# Copy and prepare backend
WORKDIR /app/backend
COPY api/package*.json ./
RUN npm ci

COPY api .

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