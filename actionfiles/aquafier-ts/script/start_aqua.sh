#!/bin/bash

# Set default values if not provided
DB_USER=${DB_USER:-aquafier}
DB_PASSWORD=${DB_PASSWORD:-changeme}
POSTGRES_DB=${POSTGRES_DB:-aquafier}

# Wait for database to be ready with improved error handling
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
  # Use PGPASSWORD to avoid interactive password prompt
  export PGPASSWORD=$DB_PASSWORD

  # Try to connect to PostgreSQL and check if it responds
  if psql -h postgres -U "$DB_USER" -d "$POSTGRES_DB" -c "SELECT 1" > /dev/null 2>&1; then
    echo "Database is ready!"
    break
  fi

  echo "Waiting for database connection... (Attempt $((attempt+1))/$max_attempts)"
  sleep 5
  attempt=$((attempt+1))

  if [ $attempt -eq $max_attempts ]; then
    echo "ERROR: Could not connect to database after $max_attempts attempts"
    exit 1
  fi
done

# Unset PGPASSWORD for security
unset PGPASSWORD

# Run Prisma migrations
cd /app/backend
prisma migrate deploy || {
  echo "ERROR: Prisma migration failed"
  exit 1
}

# Set backend URL
if [[ -z "${BACKEND_URL}" ]]; then
  export BACKEND_URL=http://127.0.0.1:3000
else
  export BACKEND_URL=https://${BACKEND_URL}
fi

# Replace backend URL placeholder in config
sed -i -e "s|BACKEND_URL_PLACEHOLDER|$BACKEND_URL|g" /app/frontend/config.json

# Start backend in the background
cd /app/backend
npm run dev &

# Serve frontend
cd /app/frontend
serve -s . -l 3600 &

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?