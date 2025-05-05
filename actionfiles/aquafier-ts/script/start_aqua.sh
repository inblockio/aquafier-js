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

# Run Prisma commands with proper initialization
cd /app/backend

# Initialize Prisma client first
echo "Generating Prisma client..."
ERROR_LOG=$(mktemp)

if ! npx prisma generate 2> >(tee "$ERROR_LOG" >&2); then
  echo "ERROR: Prisma generate failed. Error details:"
  cat "$ERROR_LOG"
  cp "$ERROR_LOG" /app/prisma_generate_error.log
  echo "Full error log saved to /app/prisma_generate_error.log"
  exit 1
fi
rm -f "$ERROR_LOG"

# Print Prisma version and other diagnostic info
echo "Prisma version:"
npx prisma --version

# Show the Prisma schema file
echo "Contents of prisma schema file:"
cat prisma/schema.prisma 2>/dev/null || echo "Prisma schema file not found"

# Check if the _prisma_migrations table exists
MIGRATIONS_TABLE_EXISTS=$(PGPASSWORD=$DB_PASSWORD psql -h postgres -U "$DB_USER" -d "$POSTGRES_DB" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '_prisma_migrations');" | tr -d ' ')

if [ "$MIGRATIONS_TABLE_EXISTS" = "f" ]; then
  echo "_prisma_migrations table does not exist, creating database from scratch..."
  
  # Use db push first to create tables without migrations history
  ERROR_LOG=$(mktemp)
  
  if ! npx prisma db push --accept-data-loss 2> >(tee "$ERROR_LOG" >&2); then
    echo "ERROR: Prisma db push failed. Error details:"
    cat "$ERROR_LOG"
    cp "$ERROR_LOG" /app/db_push_error.log
    echo "Full error log saved to /app/db_push_error.log"
    exit 1
  fi
  rm -f "$ERROR_LOG"
  
  # Create a migrations directory if it doesn't exist
  mkdir -p prisma/migrations
  
  # Now create a baseline migration with full error output
  echo "Creating baseline migration..."
  # Create a temporary file to capture error output
  ERROR_LOG=$(mktemp)
  
  # Run the command and capture both stdout and stderr
  if ! npx prisma migrate dev --name baseline-migration --create-only 2> >(tee "$ERROR_LOG" >&2); then
    echo "ERROR: Creating baseline migration failed. Error details:"
    cat "$ERROR_LOG"
    # Keep the error log for debugging
    cp "$ERROR_LOG" /app/migration_error.log
    echo "Full error log saved to /app/migration_error.log"
    exit 1
  fi
  rm -f "$ERROR_LOG"
  
  # Apply the migration with detailed error logging
  echo "Applying baseline migration..."
  ERROR_LOG=$(mktemp)
  
  if ! npx prisma migrate deploy 2> >(tee "$ERROR_LOG" >&2); then
    echo "ERROR: Applying baseline migration failed. Error details:"
    cat "$ERROR_LOG"
    cp "$ERROR_LOG" /app/migration_deploy_error.log
    echo "Full error log saved to /app/migration_deploy_error.log"
    exit 1
  fi
  rm -f "$ERROR_LOG"
else
  echo "_prisma_migrations table exists, running standard migrations..."
  # Just run the regular migrations with detailed error logging
  ERROR_LOG=$(mktemp)
  
  if ! npx prisma migrate dev 2> >(tee "$ERROR_LOG" >&2); then
    echo "ERROR: Prisma migrations failed. Error details:"
    cat "$ERROR_LOG"
    cp "$ERROR_LOG" /app/migrate_dev_error.log
    echo "Full error log saved to /app/migrate_dev_error.log"
    exit 1
  fi
  rm -f "$ERROR_LOG"
fi

# Set backend URL
if [[ -z "${BACKEND_URL}" ]]; then
  echo "BACKEND_URL is not set. Defaulting to http://127.0.0.1:3000"
  export BACKEND_URL=http://127.0.0.1:3000
else
  echo "BACKEND_URL is set to: ${BACKEND_URL}"
  export BACKEND_URL=http://${BACKEND_URL}
fi

# Replace backend URL placeholder in config
sed -i -e "s|BACKEND_URL_PLACEHOLDER|$BACKEND_URL|g" /app/frontend/config.json

# Start backend in the background
cd /app/backend
node dist/index.js &

# Serve frontend
cd /app/frontend
# Create a serve.json file with proper MIME type configuration
cat > serve.json << EOF
{
  "headers": [
    {
      "source": "**/*.js",
      "headers": [{ "key": "Content-Type", "value": "application/javascript" }]
    },
    {
      "source": "**/*.mjs",
      "headers": [{ "key": "Content-Type", "value": "application/javascript" }]
    }
  ]
}
EOF

# Start serve with the configuration
serve -s . -l 3600 &

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?