#!/bin/bash
set -ex

# LOGGING: Create detailed log
LOGFILE="/var/log/aquafier_startup.log"
exec 19>&1
exec 1> >(tee -a $LOGFILE)
exec 2>&1

echo "=== STARTUP LOG - $(date) ==="
echo "Container started with environment:"
echo "RESET_DATABASE=${RESET_DATABASE:-false}"
echo "RESTORE_BACKUP=${RESTORE_BACKUP:-false}"
echo "NODE_ENV=${NODE_ENV:-production}"

# Set default values if not provided
DB_USER=${DB_USER:-aquafier}
DB_PASSWORD=${DB_PASSWORD:-changeme}
DB_NAME=${DB_NAME:-aquafier}

# NEW: Check for database reset flag
RESET_DATABASE=${RESET_DATABASE:-false}

echo "Database configuration: User=$DB_USER, DB=$DB_NAME, Reset=$RESET_DATABASE"

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

# DETAILED DATABASE ANALYSIS
echo "=== PRE-MIGRATION DATABASE STATE ==="
export PGPASSWORD=$DB_PASSWORD

# Count all tables
all_tables=$(psql -h postgres -U "$DB_USER" -d "$DB_NAME" -t -c "
  SELECT count(*) 
  FROM information_schema.tables 
  WHERE table_schema='public' 
    AND table_type='BASE TABLE'
" 2>/dev/null | xargs || echo "0")

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

# Count existing data
user_count=$(psql -h postgres -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM users" 2>/dev/null | xargs || echo "0")
file_count=$(psql -h postgres -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM file" 2>/dev/null | xargs || echo "0")
revision_count=$(psql -h postgres -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM revision" 2>/dev/null | xargs || echo "0")
siwe_count=$(psql -h postgres -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM siwe_session" 2>/dev/null | xargs || echo "0")

# Check if database has actual data
data_exists="false"
if [ "$user_count" -gt "0" ] || [ "$file_count" -gt "0" ] || [ "$revision_count" -gt "0" ]; then
    data_exists="true"
fi

echo "Database state before migration:"
echo "  Total tables: $all_tables"
echo "  App tables: $table_count" 
echo "  Migration table exists: $migration_table_exists"
echo "  Users: $user_count"
echo "  Files: $file_count"
echo "  Revisions: $revision_count"
echo "  SIWE Sessions: $siwe_count"
echo "  Has data: $data_exists"

# List all tables
echo "All tables in database:"
psql -h postgres -U "$DB_USER" -d "$DB_NAME" -c "\dt" 2>/dev/null || echo "No tables found"

unset PGPASSWORD

# Run Prisma commands with proper initialization
cd /app/backend

# Always generate Prisma client first
echo "Generating Prisma client..."
npx prisma generate || {
  echo "ERROR: Prisma generate failed"
  exit 1
}

echo "=== MIGRATION DECISION LOGIC ==="

# NEW: Handle explicit database reset
if [ "$RESET_DATABASE" = "true" ]; then
    echo "🗑️  RESET_DATABASE=true detected - RESETTING DATABASE!"
    echo "⚠️  WARNING: This will delete all existing data!"
    echo "Pre-reset data counts: Users=$user_count, Files=$file_count, Revisions=$revision_count"
    
    # FIXED: Use a more reliable reset approach
    echo "Step 1: Resetting database with migrate reset..."
    npx prisma migrate reset --force || {
        echo "Migrate reset failed, trying manual approach..."
        # Manual reset approach
        echo "Step 1a: Dropping all tables manually..."
        export PGPASSWORD=$DB_PASSWORD
        psql -h postgres -U "$DB_USER" -d "$DB_NAME" -c "
        DROP SCHEMA public CASCADE;
        CREATE SCHEMA public;
        GRANT ALL ON SCHEMA public TO postgres;
        GRANT ALL ON SCHEMA public TO public;
        " || {
            echo "Manual schema reset failed"
            exit 1
        }
        unset PGPASSWORD
        
        echo "Step 1b: Pushing fresh schema..."
        npx prisma db push --force-reset || {
            echo "ERROR: Schema push after manual reset failed"
            exit 1
        }
    }
    
    # CRITICAL: Ensure schema is properly applied after reset
    echo "Step 2: Verifying and applying schema after reset..."
    
    # Check if tables were created by reset
    export PGPASSWORD=$DB_PASSWORD
    tables_after_reset=$(psql -h postgres -U "$DB_USER" -d "$DB_NAME" -t -c "
      SELECT count(*) 
      FROM information_schema.tables 
      WHERE table_schema='public' 
        AND table_type='BASE TABLE'
        AND table_name != '_prisma_migrations'
    " 2>/dev/null | xargs || echo "0")
    unset PGPASSWORD
    
    echo "Tables after reset: $tables_after_reset"
    
    # If no tables were created, force schema creation
    if [ "$tables_after_reset" -eq "0" ]; then
        echo "Step 2a: No tables found after reset, forcing schema creation..."
        npx prisma db push || {
            echo "ERROR: Failed to create schema after reset"
            exit 1
        }
    fi
    
    # ADDITIONAL: Run migrate dev to ensure proper migration state
    echo "Step 3: Initializing migration history..."
    npx prisma migrate dev --name init --create-only || {
        echo "Could not create migration file, but schema should be ready"
    }
    
    # Apply the migration if it was created
    npx prisma migrate deploy || {
        echo "Migration deploy failed, but schema should still be ready"
    }
    
    echo "✅ Database reset complete - fresh start!"
    
# Handle restored backups
elif [ "$RESTORE_BACKUP" = "true" ] && [ "$data_exists" = "true" ]; then
    echo "=== RESTORED DATABASE DETECTED ==="
    echo "Skipping destructive Prisma operations to preserve restored data..."
    
    if [ "$migration_table_exists" = "0" ]; then
        echo "Creating Prisma migration history for restored database..."
        
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
    fi
    
    echo "✅ Restored database setup complete - data preserved!"

# Handle empty databases
elif [ "$table_count" -eq "0" ] || [ "$data_exists" = "false" ]; then
    echo "=== EMPTY DATABASE DETECTED ==="
    echo "Running full Prisma initialization for empty database..."
    
    # Always use db push for empty databases to ensure all tables are created
    echo "Pushing complete schema to empty database..."
    npx prisma db push || {
        echo "ERROR: Schema push failed"
        exit 1
    }
    
    echo "✅ Empty database initialized successfully"

# Handle existing databases with data
else
    echo "=== EXISTING DATABASE WITH DATA DETECTED ==="
    echo "🔒 PRESERVING EXISTING DATA"
    echo "Current data: Users=$user_count, Files=$file_count, Revisions=$revision_count"
    
    # Check if all required tables exist
    export PGPASSWORD=$DB_PASSWORD
    required_tables="users file revision siwe_session"
    missing_tables=""
    
    for table in $required_tables; do
        exists=$(psql -h postgres -U "$DB_USER" -d "$DB_NAME" -t -c "
            SELECT count(*) FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = '$table'
        " 2>/dev/null | xargs || echo "0")
        
        if [ "$exists" = "0" ]; then
            missing_tables="$missing_tables $table"
        fi
    done
    unset PGPASSWORD
    
    if [ -n "$missing_tables" ]; then
        echo "⚠️  Missing required tables:$missing_tables"
        echo "Adding missing tables with schema push..."
        npx prisma db push || {
            echo "ERROR: Could not add missing tables"
            exit 1
        }
        echo "✅ Missing tables added"
    else
        echo "✅ All required tables present"
        
        # Try to deploy any pending migrations safely
        if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
            echo "Attempting to deploy any pending migrations..."
            npx prisma migrate deploy || {
                echo "Migration deploy failed, but continuing with existing schema"
            }
        fi
    fi
    
    echo "✅ Existing database preserved and updated safely"
fi

# POST-MIGRATION VERIFICATION
echo "=== POST-MIGRATION DATABASE STATE ==="
export PGPASSWORD=$DB_PASSWORD

final_user_count=$(psql -h postgres -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM users" 2>/dev/null | xargs || echo "0")
final_file_count=$(psql -h postgres -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM file" 2>/dev/null | xargs || echo "0")
final_revision_count=$(psql -h postgres -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM revision" 2>/dev/null | xargs || echo "0")
final_siwe_count=$(psql -h postgres -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM siwe_session" 2>/dev/null | xargs || echo "0")

# CRITICAL: Check if siwe_session table exists
siwe_table_exists=$(psql -h postgres -U "$DB_USER" -d "$DB_NAME" -t -c "
  SELECT count(*) 
  FROM information_schema.tables 
  WHERE table_schema='public' 
    AND table_name = 'siwe_session'
" 2>/dev/null | xargs || echo "0")

echo "Final database state:"
echo "  Users: $final_user_count (was $user_count)"
echo "  Files: $final_file_count (was $file_count)"  
echo "  Revisions: $final_revision_count (was $revision_count)"
echo "  SIWE Sessions: $final_siwe_count (was $siwe_count)"
echo "  SIWE table exists: $siwe_table_exists"

# CRITICAL: Fail if siwe_session table is missing
if [ "$siwe_table_exists" = "0" ]; then
    echo "🚨 CRITICAL ERROR: siwe_session table is missing!"
    echo "Attempting emergency schema push..."
    npx prisma db push --force || {
        echo "Emergency schema push failed!"
        exit 1
    }
    
    # Re-check
    siwe_table_exists=$(psql -h postgres -U "$DB_USER" -d "$DB_NAME" -t -c "
      SELECT count(*) 
      FROM information_schema.tables 
      WHERE table_schema='public' 
        AND table_name = 'siwe_session'
    " 2>/dev/null | xargs || echo "0")
    
    if [ "$siwe_table_exists" = "0" ]; then
        echo "🚨 FATAL: Could not create siwe_session table!"
        exit 1
    else
        echo "✅ Emergency schema push successful - siwe_session table created"
    fi
fi

# Check for data loss
if [ "$RESET_DATABASE" != "true" ] && [ "$data_exists" = "true" ]; then
    if [ "$final_user_count" -lt "$user_count" ] || [ "$final_file_count" -lt "$file_count" ] || [ "$final_revision_count" -lt "$revision_count" ]; then
        echo "🚨 POTENTIAL DATA LOSS DETECTED!"
        echo "Data counts decreased unexpectedly"
    else
        echo "✅ Data preservation verified"
    fi
fi

echo "Final table list:"
psql -h postgres -U "$DB_USER" -d "$DB_NAME" -c "\dt" 2>/dev/null || echo "No tables found"

unset PGPASSWORD

# Replace backend URL placeholder in config
sed -i -e "s|BACKEND_URL_PLACEHOLDER|$BACKEND_URL|g" /app/frontend/config.json

# In your startup script, add this before starting the frontend:
# "BACKEND_URL": "$BACKEND_URL",
cat > /app/frontend/config.json << EOF
{
  "VITE_SENTRY_DSN": "$VITE_SENTRY_DSN",
  "CUSTOM_LANDING_PAGE_URL": "$CUSTOM_LANDING_PAGE_URL",
  "CUSTOM_LOGO_URL": "$CUSTOM_LOGO_URL"
}
EOF

echo "=== STARTING SERVICES ==="

# Start backend in the background
cd /app/backend
echo "Starting backend..."
node dist/index.js &
backend_pid=$!

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
echo "Starting frontend..."
serve -s . -l 3600 &
frontend_pid=$!

#extra aquafier log
touch /var/log/aquafier_ext
tail -f /var/log/aquafier_ext &

echo "=== SERVICES STARTED ==="
echo "Backend PID: $backend_pid"
echo "Frontend PID: $frontend_pid"
echo "Startup complete at $(date)"
echo "========================="

# Restore original stdout
exec 1>&19 19>&-

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?

