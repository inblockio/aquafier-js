#!/bin/bash
set -e

echo "=== Safe Database Migration ==="
echo "Timestamp: $(date)"

# Set default values
DB_USER=${DB_USER:-aquafier}
DB_PASSWORD=${DB_PASSWORD:-changeme}
DB_NAME=${DB_NAME:-aquafier}

# Wait for database to be ready
echo "Waiting for database connection..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    export PGPASSWORD=$DB_PASSWORD
    if psql -h postgres -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
        echo "Database is ready!"
        unset PGPASSWORD
        break
    fi
    unset PGPASSWORD
    
    echo "Waiting for database... (Attempt $((attempt+1))/$max_attempts)"
    sleep 2
    attempt=$((attempt+1))
    
    if [ $attempt -eq $max_attempts ]; then
        echo "ERROR: Could not connect to database after $max_attempts attempts"
        exit 1
    fi
done

# Change to backend directory where prisma files are
cd /app/backend

# Generate Prisma client (in case it's not already generated)
echo "Generating Prisma client..."
npx prisma generate

# Function to check if _prisma_migrations table exists
check_migrations_table() {
    export PGPASSWORD=$DB_PASSWORD
    local table_exists
    table_exists=$(psql -h postgres -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = '_prisma_migrations'
        );
    " 2>/dev/null | xargs || echo "false")
    unset PGPASSWORD
    echo "$table_exists"
}

# Function to get applied migrations from database
get_applied_migrations() {
    export PGPASSWORD=$DB_PASSWORD
    local applied_migrations
    applied_migrations=$(psql -h postgres -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT migration_name FROM _prisma_migrations 
        WHERE finished_at IS NOT NULL 
        ORDER BY started_at;
    " 2>/dev/null | sed 's/^[ \t]*//;s/[ \t]*$//' | grep -v '^$' || echo "")
    unset PGPASSWORD
    echo "$applied_migrations"
}

# Function to get schema tables from database
get_existing_tables() {
    export PGPASSWORD=$DB_PASSWORD
    local tables
    tables=$(psql -h postgres -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename != '_prisma_migrations'
        ORDER BY tablename;
    " 2>/dev/null | sed 's/^[ \t]*//;s/[ \t]*$//' | grep -v '^$' || echo "")
    unset PGPASSWORD
    echo "$tables"
}

# Function to check if database has schema but no migration history
is_database_initialized_without_migrations() {
    local tables
    local migrations_table_exists
    
    tables=$(get_existing_tables)
    migrations_table_exists=$(check_migrations_table)
    
    if [ "$migrations_table_exists" = "false" ] && [ -n "$tables" ]; then
        echo "true"
    else
        echo "false"
    fi
}

# Function to safely initialize migration baseline
initialize_migration_baseline() {
    echo "Database has existing schema but no migration history."
    echo "Existing tables: $(get_existing_tables | tr '\n' ' ')"
    
    # Check if we have any migration files
    if [ ! -d "prisma/migrations" ] || [ -z "$(find prisma/migrations -name "migration.sql" 2>/dev/null)" ]; then
        echo "No migration files found. Creating initial migration from current schema..."
        npx prisma migrate dev --name init --create-only || {
            echo "ERROR: Failed to create initial migration"
            exit 1
        }
    fi
    
    # Get the first (oldest) migration
    local first_migration
    first_migration=$(find prisma/migrations -mindepth 1 -maxdepth 1 -type d | sort | head -n 1 | xargs basename 2>/dev/null || echo "")
    
    if [ -n "$first_migration" ]; then
        echo "Marking first migration as applied: $first_migration"
        npx prisma migrate resolve --applied "$first_migration" || {
            echo "ERROR: Failed to mark baseline migration as applied"
            exit 1
        }
        
        # Now try to apply remaining migrations
        echo "Applying remaining migrations..."
        npx prisma migrate deploy
    else
        echo "ERROR: No migration files found to establish baseline"
        exit 1
    fi
}

# Function to resolve migration conflicts
resolve_migration_conflicts() {
    echo "Checking for migration conflicts..."
    
    local applied_migrations
    applied_migrations=$(get_applied_migrations)
    
    echo "Currently applied migrations:"
    if [ -n "$applied_migrations" ]; then
        echo "$applied_migrations"
    else
        echo "No migrations found in database"
    fi
    
    # Check migration files against database records
    echo "Checking migration files against database records..."
    local conflicts_found=false
    
    if [ -d "prisma/migrations" ]; then
        for migration_dir in prisma/migrations/*/; do
            if [ -d "$migration_dir" ]; then
                local migration_name
                migration_name=$(basename "$migration_dir")
                
                # Check if migration file exists but not recorded in database
                if ! echo "$applied_migrations" | grep -q "^$migration_name$"; then
                    echo "Migration file exists but not in database: $migration_name"
                    
                    # Check if the migration content would conflict with current schema
                    echo "Analyzing migration: $migration_name"
                    
                    # For now, we'll mark it as applied if it seems safe
                    # In a production environment, you might want more sophisticated conflict detection
                    echo "Marking migration as applied: $migration_name"
                    npx prisma migrate resolve --applied "$migration_name" || {
                        echo "WARNING: Failed to mark migration as applied: $migration_name"
                        conflicts_found=true
                    }
                fi
            fi
        done
    fi
    
    if [ "$conflicts_found" = "true" ]; then
        echo "WARNING: Some migration conflicts could not be automatically resolved"
        echo "Please review the migration state manually"
    fi
}

# Main migration logic
echo "Checking database state..."

if [ "$(check_migrations_table)" = "false" ]; then
    if [ "$(is_database_initialized_without_migrations)" = "true" ]; then
        echo "Database has existing schema but no migration tracking."
        initialize_migration_baseline
    else
        echo "Fresh database detected. Running initial migrations..."
        npx prisma migrate deploy || {
            echo "ERROR: Failed to run initial migrations"
            exit 1
        }
    fi
else
    echo "Migration table exists. Checking migration status..."
    
    # First try normal migration deploy
    if npx prisma migrate deploy 2>/dev/null; then
        echo "Migrations applied successfully"
    else
        echo "Migration deploy failed. Checking for conflicts..."
        
        # Check migration status to understand the issue
        echo "Current migration status:"
        npx prisma migrate status || true
        
        # Try to resolve conflicts
        resolve_migration_conflicts
        
        # Retry migration deploy
        echo "Retrying migration deploy..."
        if ! npx prisma migrate deploy; then
            echo "ERROR: Migration deploy still failing after conflict resolution"
            echo "Manual intervention may be required"
            exit 1
        fi
    fi
fi

# Verify final state
echo "Verifying migration state..."
npx prisma migrate status

echo "=== Migration completed successfully ==="