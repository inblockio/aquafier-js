#!/bin/bash
set -e

echo "=== Simple Database Migration ==="
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

# Run migrations with baseline handling
echo "Running Prisma migrations..."
if ! npx prisma migrate deploy; then
    echo "Migration deploy failed, attempting to resolve baseline issues..."
    echo "Checking if this is a baseline issue (P3005)..."
    
    # Get migration status to see what's applied vs pending
    echo "Checking migration status..."
    npx prisma migrate status || true
    
    # Instead of marking all as applied, use db push to sync schema
    echo "Using db push to sync schema with current state..."
    npx prisma db push --force-reset || {
        echo "DB push failed, falling back to baseline resolution..."
        
        # Query database to see which migrations are already recorded
        echo "Checking which migrations are already recorded in database..."
        export PGPASSWORD=$DB_PASSWORD
        
        # Get list of migrations already in the database
        applied_migrations=$(psql -h postgres -U "$DB_USER" -d "$DB_NAME" -t -c "
            SELECT migration_name FROM _prisma_migrations 
            WHERE finished_at IS NOT NULL 
            ORDER BY started_at;
        " 2>/dev/null | sed 's/^[ \t]*//;s/[ \t]*$//' | grep -v '^$' || echo "")
        
        unset PGPASSWORD
        
        echo "Already applied migrations in database:"
        echo "$applied_migrations"
        
        # Only mark migrations as applied if they're NOT already in the database
        echo "Checking migration files against database records..."
        for migration_dir in prisma/migrations/*/; do
            if [ -d "$migration_dir" ]; then
                migration_name=$(basename "$migration_dir")
                
                # Check if this migration is already recorded in database
                if echo "$applied_migrations" | grep -q "^$migration_name$"; then
                    echo "Migration $migration_name already recorded in database, skipping"
                else
                    echo "Migration $migration_name not found in database, marking as applied"
                    npx prisma migrate resolve --applied "$migration_name" || true
                fi
            fi
        done
        
        # Try deploy again to apply any remaining migrations
        echo "Retrying migration deploy to apply remaining migrations..."
        npx prisma migrate deploy
    }
fi

echo "=== Migration completed successfully ==="
