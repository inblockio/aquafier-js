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
  # Create env file with restricted permissions
  touch /app/utils/env
  chmod 600 /app/utils/env
  env | grep -E '^(DB_|S3_|BACKUP_COUNT)' >> /app/utils/env
  echo "prepare backup cron"
  printf '%s /app/utils/create_backup.sh >> /var/log/aquafier_ext 2>&1\n\n' "${BACKUP_CRON}" > /etc/cron.d/backup_cron
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

# Check if database has been restored (contains data)
echo "Checking database state..."
export PGPASSWORD=$DB_PASSWORD

# Count non-system tables
table_count=$(psql -h postgres -U "$DB_USER" -d "$DB_NAME" -t -c "
  SELECT count(*) 
  FROM information_schema.tables 
  WHERE table_schema='public' 
    AND table_type='BASE TABLE'
    AND table_name != '_prisma_migrations'
" 2>/dev/null | xargs || echo "0")

# Check if _prisma_migrations exists
migration_table_exists=$(psql -h postgres -U "$DB_USER" -d "$DB_NAME" -t -c "
  SELECT count(*) 
  FROM information_schema.tables 
  WHERE table_schema='public' 
    AND table_name = '_prisma_migrations'
" 2>/dev/null | xargs || echo "0")

# Check if database has actual data (not just empty tables)
data_exists="false"
if [ "$table_count" -gt "0" ]; then
    # Check a few key tables for data
    user_count=$(psql -h postgres -U "$DB_USER" -d "$DB_NAME" -t -c "
      SELECT COALESCE((
        SELECT count(*) FROM users
        UNION ALL
        SELECT count(*) FROM file
        UNION ALL  
        SELECT count(*) FROM revision
        ORDER BY 1 DESC LIMIT 1
      ), 0)
    " 2>/dev/null | xargs || echo "0")
    
    if [ "$user_count" -gt "0" ]; then
        data_exists="true"
    fi
fi

echo "Database analysis: tables=$table_count, migration_table=$migration_table_exists, has_data=$data_exists, restore_mode=$RESTORE_BACKUP"

# Unset PGPASSWORD for security
unset PGPASSWORD

# Run Prisma commands with proper initialization
cd /app/backend

# Always generate Prisma client first
echo "Generating Prisma client..."
npx prisma generate || {
  echo "ERROR: Prisma generate failed"
  exit 1
}

# Handle Prisma setup based on database state
if [ "$RESTORE_BACKUP" = "true" ] && [ "$data_exists" = "true" ]; then
    echo "=== RESTORED DATABASE DETECTED ==="
    echo "Skipping destructive Prisma operations to preserve restored data..."
    
    if [ "$migration_table_exists" = "0" ]; then
        echo "Creating Prisma migration history for restored database..."
        
        # Create migration table and mark as migrated
        export PGPASSWORD=$DB_PASSWORD
        
        # Create the _prisma_migrations table
        psql -h postgres -U "$DB_USER" -d "$DB_NAME" -c "
        CREATE TABLE IF NOT EXISTS \"_prisma_migrations\" (
            \"id\" VARCHAR(36) PRIMARY KEY,
            \"checksum\" VARCHAR(64) NOT NULL,
            \"finished_at\" TIMESTAMPTZ,
            \"migration_name\" VARCHAR(255) NOT NULL,
            \"logs\" TEXT,
            \"rolled_back_at\" TIMESTAMPTZ,
            \"started_at\" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            \"applied_steps_count\" INTEGER NOT NULL DEFAULT 0
        );"
        
        # Insert initial migration record
        migration_id=$(date +"%Y%m%d%H%M%S")_restored_backup
        psql -h postgres -U "$DB_USER" -d "$DB_NAME" -c "
        INSERT INTO \"_prisma_migrations\" (
            \"id\", 
            \"checksum\", 
            \"migration_name\", 
            \"started_at\", 
            \"finished_at\",
            \"applied_steps_count\"
        ) VALUES (
            '${migration_id}',
            'restored-$(date +%s)',
            '${migration_id}_init',
            NOW(),
            NOW(),
            1
        );"
        
        unset PGPASSWORD
        echo "✅ Migration history created for restored database"
    else
        echo "✅ Migration table already exists, database ready"
    fi
    
    # Verify schema is in sync (non-destructive)
    echo "Verifying Prisma schema alignment..."
    npx prisma db pull --force --print || echo "WARN: Could not pull schema, but continuing..."
    
    echo "✅ Restored database setup complete - data preserved!"

elif [ "$table_count" -eq "0" ] || [ "$data_exists" = "false" ]; then
    echo "=== EMPTY DATABASE DETECTED ==="
    echo "Running full Prisma initialization for empty database..."
    
    # Standard initialization for empty database
    npx prisma migrate dev --name init || {
        echo "Migration failed, trying to push schema directly..."
        npx prisma db push --force-reset || {
            echo "ERROR: Both migration and schema push failed"
            exit 1
        }
        
        # After successful db push, try migrations again
        npx prisma migrate dev --name init || {
            echo "WARN: Could not create migrations after schema push, but schema is ready"
        }
    }
    
    echo "✅ Empty database initialized successfully"

else
    echo "=== EXISTING DATABASE DETECTED ==="
    echo "Running safe Prisma operations for existing database..."
    
    # For existing database with data, be more careful
    npx prisma migrate dev --name init || {
        echo "Migration failed, checking if safe push is possible..."
        
        # Only do force reset if explicitly requested or if it's clearly a dev environment
        if [ "$FORCE_SCHEMA_RESET" = "true" ] || [ "$NODE_ENV" = "development" ]; then
            echo "WARNING: Forcing schema reset - this will delete data!"
            npx prisma db push --force-reset || {
                echo "ERROR: Schema push failed"
                exit 1
            }
        else
            echo "ERROR: Migration failed and force reset not enabled. Set FORCE_SCHEMA_RESET=true if you want to reset schema."
            exit 1
        fi
    }
    
    echo "✅ Existing database setup complete"
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


# #!/bin/bash

# set -ex

# # Set default values if not provided
# DB_USER=${DB_USER:-aquafier}
# DB_PASSWORD=${DB_PASSWORD:-changeme}
# DB_NAME=${DB_NAME:-aquafier}

# # Wait for database to be ready with improved error handling
# max_attempts=30
# attempt=0

# #init backup cron
# if [ -n "${BACKUP_CRON}" ]; then
#   # Create env file with restricted permissions
#   touch /app/utils/env
#   chmod 600 /app/utils/env
#   env | grep -E '^(DB_|S3_|BACKUP_COUNT)' >> /app/utils/env
#   echo "prepare backup cron"
#   printf '%s /app/utils/create_backup.sh >> /var/log/aquafier_ext 2>&1\n\n' "${BACKUP_CRON}" > /etc/cron.d/backup_cron
#   chmod 0644 /etc/cron.d/backup_cron
#   crontab /etc/cron.d/backup_cron
# fi

# while [ $attempt -lt $max_attempts ]; do
#   # Use PGPASSWORD to avoid interactive password prompt
#   # export PGPASSWORD=$DB_NAME
#   export PGPASSWORD=$DB_PASSWORD
 
#   # Try to connect to PostgreSQL and check if it responds
#   if psql -h postgres -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
#     echo "Database is ready!"
#     break
#   fi
  
#   echo "Waiting for database connection... (Attempt $((attempt+1))/$max_attempts)"
#   sleep 5
#   attempt=$((attempt+1))

#   if [ $attempt -eq $max_attempts ]; then
#     echo "ERROR: Could not connect to database after $max_attempts attempts"
#     exit 1
#   fi
# done

# # Unset PGPASSWORD for security
# unset PGPASSWORD

# # Run Prisma commands with proper initialization
# cd /app/backend

# # Initialize Prisma client first
# echo "Generating Prisma client..."
# npx prisma generate || {
#   echo "ERROR: Prisma generate failed"
#   exit 1
# }

# # Try creating the initial database schema if migrations fail
# echo "Running Prisma migrations..."
# npx prisma migrate dev --name init || {
#   echo "Migration failed, trying to push schema directly..."
#   npx prisma db push --force-reset || {
#     echo "ERROR: Both migration and schema push failed"
#     exit 1
#   }
  
#   # After successful db push, try migrations again
#   npx prisma migrate dev --name init || {
#     echo "WARN: Could not create migrations after schema push, but schema is ready"
#     # Continue execution despite this warning
#   }
# }

# # Replace backend URL placeholder in config
# sed -i -e "s|BACKEND_URL_PLACEHOLDER|$BACKEND_URL|g" /app/frontend/config.json

# # Start backend in the background
# cd /app/backend
# node dist/index.js &

# # Serve frontend
# cd /app/frontend
# # Create a serve.json file with proper MIME type configuration
# cat > serve.json << EOF
# {
#   "headers": [
#     {
#       "source": "**/*.js",
#       "headers": [{ "key": "Content-Type", "value": "application/javascript" }]
#     },
#     {
#       "source": "**/*.mjs",
#       "headers": [{ "key": "Content-Type", "value": "application/javascript" }]
#     }
#   ]
# }
# EOF

# #start cron scheduler
# service cron start

# # Start serve with the configuration
# serve -s . -l 3600 &

# #extra aquafier log
# touch /var/log/aquafier_ext

# tail -f /var/log/aquafier_ext &

# # Wait for any process to exit
# wait -n

# # Exit with status of process that exited first
# exit $?