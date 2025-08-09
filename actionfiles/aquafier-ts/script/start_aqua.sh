#!/bin/bash

set -ex

# Set default values if not provided
DB_USER=${DB_USER:-aquafier}
DB_PASSWORD=${DB_PASSWORD:-changeme}
DB_NAME=${DB_NAME:-aquafier}

# Wait for database to be ready with improved error handling
max_attempts=30
attempt=0

#init backup cron
if [ -n "${BACKUP_CRON}" ]; then
  env | grep -e DB_ -e S3_ -e BACKUP_COUNT >> /app/utils/env
  echo "prepare backup cron"
  printf "${BACKUP_CRON} /app/utils/create_backup.sh >> /var/log/aquafier_ext 2>&1\n\n" > /etc/cron.d/backup_cron
  chmod 0644 /etc/cron.d/backup_cron
  crontab /etc/cron.d/backup_cron
fi

while [ $attempt -lt $max_attempts ]; do
  # Use PGPASSWORD to avoid interactive password prompt
  export PGPASSWORD=$DB_PASSWORD

  # Try to connect to PostgreSQL and check if it responds
  if psql -h postgres -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
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
npx prisma generate || {
  echo "ERROR: Prisma generate failed"
  exit 1
}

# Try creating the initial database schema if migrations fail
echo "Running Prisma migrations..."
npx prisma migrate dev --name init || {
  echo "Migration failed, trying to push schema directly..."
  npx prisma db push --force-reset || {
    echo "ERROR: Both migration and schema push failed"
    exit 1
  }
  
  # After successful db push, try migrations again
  npx prisma migrate dev --name init || {
    echo "WARN: Could not create migrations after schema push, but schema is ready"
    # Continue execution despite this warning
  }
}

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

#start cron scheduler
service cron start

# Start serve with the configuration
serve -s . -l 3600 &

#extra aquafier log
touch /var/log/aquafier_ext

tail -f /var/log/aquafier_ext &

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?