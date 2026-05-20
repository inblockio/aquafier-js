FROM node:24-slim AS builder_web

WORKDIR /build/web
RUN corepack enable && corepack prepare pnpm@11.1.3 --activate
COPY web .
RUN pnpm install --frozen-lockfile

RUN pnpm run build

FROM node:24-slim AS builder_api

# Copy and prepare backend
WORKDIR /build/api
RUN corepack enable && corepack prepare pnpm@11.1.3 --activate
COPY api .
RUN pnpm install --frozen-lockfile

# Compile TypeScript to JavaScript
RUN pnpm run build

FROM node:24-slim

# pnpm 11 refuses global installs (pnpm add -g) unless its global bin dir is on PATH.
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

SHELL ["/bin/bash", "-o", "pipefail", "-c"]
RUN corepack enable && corepack prepare pnpm@11.1.3 --activate

# Create necessary directories first
RUN mkdir -p /app/utils

COPY actionfiles/aquafier-ts/script/entrypoint.sh /app/utils/entrypoint.sh
# Normalize line endings and ensure executable bit for entrypoint
RUN sed -i 's/\r$//' /app/utils/entrypoint.sh && chmod +x /app/utils/entrypoint.sh
ENTRYPOINT ["/app/utils/entrypoint.sh"]

# Install system dependencies
RUN apt-get update && apt-get install -y \
    netcat-openbsd \
    wget \
    cron \
    tar \
    gnupg \
    jq \
    && wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add - \
    && sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" > /etc/apt/sources.list.d/pgdg.list' \
    && apt update \
    && apt install postgresql-client -y \
    && rm -rf /var/lib/apt/lists/*

# prepare backup tools and dir
RUN wget https://dl.min.io/client/mc/release/linux-amd64/mc && chmod +x mc
RUN mkdir /backup

EXPOSE 3000
EXPOSE 3600
 
# Create necessary directories
RUN mkdir -p /app/backend /app/frontend /app/data

COPY api/prisma /app/backend/prisma

#we need prisma migration
WORKDIR /app/backend

# Install 'serve' globally — start_aqua.sh uses it to serve the built frontend.
# prisma is NOT installed globally: runtime scripts use the local prisma from the --prod install.
RUN pnpm add -g serve@14.2.6

# Copy frontend and backend build artifacts
COPY --from=builder_web /build/web/dist /app/frontend
COPY --from=builder_api /build/api/dist /app/backend/dist
COPY --from=builder_api /build/api/assets /app/backend/assets
COPY --from=builder_api /build/api/package.json /app/backend/package.json
COPY --from=builder_api /build/api/pnpm-lock.yaml /app/backend/pnpm-lock.yaml
COPY --from=builder_api /build/api/pnpm-workspace.yaml /app/backend/pnpm-workspace.yaml

# Install backend dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy startup and migration scripts
COPY actionfiles/aquafier-ts/script/start_aqua.sh /app/start_aqua.sh
RUN sed -i 's/\r$//' /app/start_aqua.sh && chmod +x /app/start_aqua.sh

COPY actionfiles/aquafier-ts/script/simple_migrate.sh /app/simple_migrate.sh
RUN sed -i 's/\r$//' /app/simple_migrate.sh && chmod +x /app/simple_migrate.sh

COPY actionfiles/aquafier-ts/script/create_backup.sh /app/utils/create_backup.sh
RUN sed -i 's/\r$//' /app/utils/create_backup.sh && chmod +x /app/utils/create_backup.sh
COPY actionfiles/aquafier-ts/script/restore_backup.sh /app/utils/restore_backup.sh
RUN sed -i 's/\r$//' /app/utils/restore_backup.sh && chmod +x /app/utils/restore_backup.sh

COPY web/src/version-info.json /app/

WORKDIR /app
CMD ["./start_aqua.sh"]