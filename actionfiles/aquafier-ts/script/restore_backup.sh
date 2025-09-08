#!/bin/bash

set -ex

echo "=== DEBUG: Current working directory ==="
pwd
echo "========================================"

echo "=== DEBUG: Checking /restore directory ==="
ls -la /restore
echo "=== DEBUG: Looking for backup files ==="
find /restore -name "backup*" -type f
echo "=== DEBUG: Current environment ==="
env | grep RESTORE || echo "No RESTORE env vars found"
echo "=================================="

if [ -d  "/restore" ]; then
    files=$(find /restore -maxdepth 1 -name "backup*.tar.gz")
    count=$(find /restore -maxdepth 1 -name "backup*.tar.gz"| wc -l)
    
    if [ "${count}" -eq 1 ]; then
        echo "✅ Found backup file!"
        
        if [ -z "${RESTORE_BACKUP}" ] || [ "${RESTORE_BACKUP}" != "true" ]; then
            echo "❌ Please set RESTORE_BACKUP=true if you want to restore the backup. But be careful: this will delete all files!"
            exit 1;
        fi
        
        if [ -n "${RESTORE_BACKUP}" ] && [ "${RESTORE_BACKUP}" == "true" ]; then
            echo "🔄 Starting backup restoration process..."
            
            backupFile=$(echo "$files" | head -n1)
            echo "📁 Backup file: $backupFile"

            # Clean up any existing workdir
            if [ -d "/restore/workdir" ]; then
                rm -rf /restore/workdir
            fi

            # Extract backup
            mkdir /restore/workdir
            echo "📤 Extracting backup..."
            tar -xvf "${backupFile}" -C /restore/workdir

            # Version check
            backup_hash=$(jq -r '.commitHash' /restore/workdir/version-info.json 2>/dev/null || echo "unknown")
            server_hash=$(jq -r '.commitHash' /app/version-info.json 2>/dev/null || echo "unknown")
            if [ "$backup_hash" != "$server_hash" ]; then
                echo "⚠️  WARNING: Aquafier commit-hash mismatch!"
                printf "   Backup: %s\n   Server: %s\n" "$backup_hash" "$server_hash"
                echo "   Continuing anyway, but there might be compatibility issues..."
            else
                echo "✅ Version check passed: $server_hash"
            fi

            cd /restore/workdir/

            # Database credentials check
            if [ -z "${DB_PASSWORD}" ] || [ -z "${DB_USER}" ] || [ -z "${DB_NAME}" ]; then
                echo "❌ Missing database credentials"
                exit 1;
            fi

            # Database restoration
            echo "🗄️  Restoring database..."
            
            # Drop and recreate database
            PGPASSWORD="${DB_PASSWORD}" psql -U "${DB_USER}" -h postgres -d postgres -c "DROP DATABASE IF EXISTS \"${DB_NAME}\";"
            PGPASSWORD=${DB_PASSWORD} psql -U "${DB_USER}" -h postgres -d postgres -c "CREATE DATABASE ${DB_NAME};"
            
            # Restore from backup
            echo "📊 Importing database backup..."
            PGPASSWORD=${DB_PASSWORD} psql -U "${DB_USER}" -h postgres -d "${DB_NAME}" < backup.sql
            
            # Verify restoration
            record_count=$(PGPASSWORD=${DB_PASSWORD} psql -U "${DB_USER}" -h postgres -d "${DB_NAME}" -t -c "
                SELECT COALESCE(
                    (SELECT count(*) FROM users) + 
                    (SELECT count(*) FROM file) + 
                    (SELECT count(*) FROM revision)
                , 0)
            " 2>/dev/null | xargs || echo "0")
            
            echo "✅ Database restored successfully! Records found: $record_count"

            # S3/MinIO restoration
            if [ -d "/restore/workdir/s3" ]; then
                echo "☁️  S3 backup found, attempting restoration..."
                
                if [ -n "${S3_USER}" ] && [ -n "${S3_PASSWORD}" ] && [ -n "${S3_BUCKET}" ] && [ -n "${S3_URL}" ]; then
                    USER=${S3_USER}
                    PASSWORD=${S3_PASSWORD}
                    BUCKET=${S3_BUCKET}
                    URL=${S3_URL}
                    USE_SSL=${S3_USE_SSL:-false}
                    PORT=${S3_PORT:-9000}

                    if [ "${USE_SSL}" = "true" ]; then
                        USE_SSL=""
                        URL="https://${URL}"
                    else
                        URL="http://${URL}"
                        USE_SSL="--insecure"
                    fi

                    echo "🔗 Connecting to S3 at ${URL}:${PORT}"
                    /mc alias set restoreDestination "${URL}":"${PORT}" "${USER}" "${PASSWORD}" "${USE_SSL}"

                    # Reset bucket
                    if /mc stat "restoreDestination/${S3_BUCKET}" > /dev/null 2>&1; then
                        echo "🗑️  Bucket exists, resetting..."
                        /mc rm -r --force "restoreDestination/${S3_BUCKET}"
                        /mc mb "restoreDestination/${S3_BUCKET}"
                    else
                        echo "📁 Creating new bucket..."
                        /mc mb "restoreDestination/${S3_BUCKET}"
                    fi

                    # Restore S3 files
                    echo "⬆️  Uploading S3 files..."
                    /mc cp /restore/workdir/s3/* "restoreDestination/${S3_BUCKET}/"
                    echo "✅ S3 restoration complete"
                else
                    echo "⚠️  S3 credentials incomplete, skipping S3 restoration"
                fi
            else
                echo "📁 No S3 backup found, skipping S3 restoration"
            fi

            # Filesystem restoration  
            if [ -d "/restore/workdir/filesystem" ]; then
                echo "📂 Restoring filesystem files..."
                
                # Prepare media directory
                if [ -d "/app/backend/media" ]; then
                    echo "🧹 Cleaning existing media files..."
                    rm --interactive=never /app/backend/media/* 2>/dev/null || true
                else
                    mkdir -p /app/backend/media
                fi
                
                # Copy files if they exist
                if [ "$(ls -A /restore/workdir/filesystem 2>/dev/null)" ]; then
                    file_count=$(ls -1 /restore/workdir/filesystem | wc -l)
                    echo "📋 Copying $file_count files..."
                    cp /restore/workdir/filesystem/* /app/backend/media/
                    echo "✅ Filesystem restoration complete"
                else
                    echo "📁 No files to restore in filesystem backup"
                fi
            else
                echo "📁 No filesystem backup found, skipping file restoration"
            fi

            # Archive the processed backup
            if [ ! -d "/restore/imported" ]; then
                mkdir /restore/imported;
            fi

            backup_name=$(basename "$backupFile")
            mv "$backupFile" "/restore/imported/${backup_name}"
            rm -rf /restore/workdir
            
            # Create restore marker for startup script
            echo "$(date): Backup $backup_name restored successfully" > /restore/.restore_complete
            
            echo "🎉 Backup restoration completed successfully!"
            echo "📁 Backup archived to: /restore/imported/${backup_name}"
        fi
    elif [ "${count}" -gt 1 ]; then
        echo "⚠️  Multiple backup files found. Please ensure only one backup file is in /restore directory."
        echo "Found files:"
        echo "$files"
        exit 1
    else
        echo "📁 No backup files found in /restore directory"
    fi
else
    echo "📁 /restore directory not found"
fi

# #!/bin/bash

# set -ex

# echo "=== DEBUG: Checking /restore directory ==="
# ls -la /restore
# echo "=== DEBUG: Looking for backup files ==="
# find /restore -name "backup*" -type f
# echo "=== DEBUG: Current environment ==="
# env | grep RESTORE
# echo "=================================="


# if [ -d  "/restore" ]; then
# files=$(find /restore -maxdepth 1 -name "backup*.tar.gz")
# count=$(find /restore -maxdepth 1 -name "backup*.tar.gz"| wc -l)
 
# if [ "${count}" -eq 1 ]; then
#   echo "found backup!"
#   if [ -z "${RESTORE_BACKUP}" ] && [ "${RESTORE_BACKUP}" != "true" ]; then
#       echo "Please set RESTORE_BACKUP=true if you want to restore the backup. But be careful: this will delete all files!"
#       exit 1;
#   fi
#    if [ -n "${RESTORE_BACKUP}" ] && [ "${RESTORE_BACKUP}" == "true" ]; then

#       backupFile=$(echo "$files" | head -n1)

#       if [ -d "/restore/workdir" ]; then
#           rm -rf /restore/workdir
#       fi

#       mkdir /restore/workdir
#       tar -xvf "${backupFile}" -C /restore/workdir


#       backup_hash=$(jq -r '.commitHash' /restore/workdir/version-info.json 2>/dev/null || echo "unknown")
#       server_hash=$(jq -r '.commitHash' /app/version-info.json 2>/dev/null || echo "unknown")
#       if [ "$backup_hash" != "$server_hash" ]; then
#           printf "Aquafier commit-hash does not match!\nbackup: %s\nserver: %s\n" "$backup_hash" "$server_hash"
#       fi

#       cd /restore/workdir/

#      if [ -z "${DB_PASSWORD}" ] && [ -z "${DB_USER}" ] && [ -z "${DB_NAME}" ]; then
#        echo "Missing database creds"
#        exit 1;
#      fi

#       #TODO split up the url and add the host here
#       PGPASSWORD="${DB_PASSWORD}" psql -U "${DB_USER}" -h postgres -d postgres -c "DROP DATABASE IF EXISTS \"${DB_NAME}\";"
#       PGPASSWORD=${DB_PASSWORD} psql -U "${DB_USER}" -h postgres -d postgres -c "CREATE DATABASE ${DB_NAME};"
#       PGPASSWORD=${DB_PASSWORD} psql -U "${DB_USER}" -h postgres -d "${DB_NAME}" < backup.sql
#       echo "Successfully restored the database!"

#       # check if s3 restore is necessary
#       if [ -d "/restore/workdir/s3" ]; then
#         # check if all creds are present
#         if [ -n "${S3_USER}" ] && [ -n "${S3_PASSWORD}" ] && [ -n "${S3_BUCKET}" ] && [ -n "${S3_URL}" ]; then
#           USER=${S3_USER}
#           PASSWORD=${S3_PASSWORD}
#           BUCKET=${S3_BUCKET}
#           URL=${S3_URL}
#           USE_SSL=${S3_USE_SSL:-false}
#           PORT=${S3_PORT:-9000}

#           if [ "${USE_SSL}" = "true" ]; then
#               USE_SSL=""
#               URL="https://${URL}"
#           else
#               URL="http://${URL}"
#               USE_SSL="--insecure"
#           fi


#           #restore the s3 storage
#           /mc alias set restoreDestination "${URL}":"${PORT}" "${USER}" "${PASSWORD}" "${USE_SSL}"

#           if /mc stat "restoreDestination/${S3_BUCKET}" > /dev/null 2>&1; then
#             echo "bucket exists! RESET"
#             /mc rm -r --force "restoreDestination/${S3_BUCKET}"
#             /mc mb "restoreDestination/${S3_BUCKET}"
#           else
#             echo "Bucket does not exists! Create them!"
#             /mc mb "restoreDestination/${S3_BUCKET}"
#           fi

#           /mc cp /restore/workdir/s3/* "restoreDestination/${S3_BUCKET}/"
#         fi
#       fi

#       if [ -d "/restore/workdir/filesystem" ]; then
#         if [ -d "/app/backend/media" ]; then
#           rm --interactive=never /app/backend/media/*
#         else
#           mkdir -p /app/backend/media
#         fi
#           if [ "$(ls -A /restore/workdir/filesystem 2>/dev/null)" ]; then
#             cp /restore/workdir/filesystem/* /app/backend/media/
#           fi
#       fi

#       if [ ! -d "/restore/imported" ]; then
#           mkdir /restore/imported;
#       fi

#       mv "$backupFile" /restore/imported;
#       rm -rf /restore/workdir
#       echo "Finished restoring backup file!"
#   fi
# fi
# fi