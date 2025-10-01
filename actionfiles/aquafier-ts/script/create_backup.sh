#!/bin/bash
set -ex

# Add logging for cron debugging
echo "=== BACKUP STARTED at $(date) ==="
echo "Current working directory: $(pwd)"
echo "Current user: $(whoami)"
echo "Environment variables loaded from /app/utils/env:"

FILE_STORAGE_PATH="/app/backend/media"

#load envs.... because this script runs in a cron-job we need to load the creds
if [ -f "/app/utils/env" ]; then
  source /app/utils/env
  echo "Environment file loaded successfully"
  echo "DB_USER: ${DB_USER:-not set}"
  echo "DB_NAME: ${DB_NAME:-not set}"
  echo "S3_USER: ${S3_USER:-not set}"
  echo "S3_BUCKET: ${S3_BUCKET:-not set}"
else
  echo "ERROR: Environment file /app/utils/env not found!"
  exit 1
fi

# Ensure we're in the right directory
cd /app

#reset backup workdir
if [ -d backup ]; then
  rm -rf backup
fi

mkdir backup

cp /app/version-info.json backup

if [ -z "${DB_PASSWORD}" ] && [ -z "${DB_USER}" ] && [ -z "${DB_NAME}" ]; then
  echo "Missing database creds"
  exit 1;
fi

#backup the sqls
PGPASSWORD="${DB_PASSWORD}" pg_dump -U "${DB_USER}" -h postgres -p 5432 "${DB_NAME}" >> backup/backup.sql

#create dump of the s3 storage with fallback to local filesystem
S3_BACKUP_SUCCESS=false

if [ -n "${S3_USER}" ] && [ -n "${S3_PASSWORD}" ] && [ -n "${S3_BUCKET}" ] && [ -n "${S3_URL}" ]; then
  echo "Attempting S3 backup..."
    USER=${S3_USER}
    PASSWORD=${S3_PASSWORD}
    BUCKET=${S3_BUCKET}
    URL=${S3_URL}
    USE_SSL=${S3_USE_SSL:-false}
    PORT=${S3_PORT:-9000}

    #we need the protocol here but in the backend we need the url without the protocol
    if [ "${USE_SSL}" = "true" ]; then
      USE_SSL=""
      URL="https://${URL}"
    else
      URL="http://${URL}"
      USE_SSL="--insecure"
    fi

    #remove workdir if exists
    if [ -d workdir ]; then
      rm -rf workdir
    fi

    mkdir workdir

    # Try S3 backup with error handling
    if /mc alias set backupSource "${URL}":"${PORT}" "${USER}" "${PASSWORD}" "${USE_SSL}" && \
       /mc mirror "backupSource/${BUCKET}" workdir; then
        echo "S3 backup successful!"
        
        #i need the files not the dir
        mkdir backup/s3
        mv workdir/* backup/s3 2>/dev/null || echo "No files found in S3 bucket"
        
        S3_BACKUP_SUCCESS=true
    else
        echo "S3 backup failed! Will fall back to local filesystem backup."
    fi

    rm -rf workdir
else
  echo "S3 credentials not provided, skipping S3 backup."
fi

# Always try local filesystem backup if S3 failed or wasn't attempted
if [ "${S3_BACKUP_SUCCESS}" = "false" ] && [ -d "${FILE_STORAGE_PATH}" ]; then
    echo "Using local filesystem backup!"
    mkdir backup/filesystem
    if [ "$(ls -A "${FILE_STORAGE_PATH}" 2>/dev/null)" ]; then
        cp "${FILE_STORAGE_PATH}"/* backup/filesystem/
        echo "Local filesystem backup completed."
    else
        echo "No files found in local filesystem storage path."
    fi
elif [ "${S3_BACKUP_SUCCESS}" = "true" ]; then
    echo "S3 backup was successful, skipping local filesystem backup."
elif [ ! -d "${FILE_STORAGE_PATH}" ]; then
    echo "Local filesystem storage path does not exist: ${FILE_STORAGE_PATH}"
fi

if [ ! -d "/backup" ]; then
  mkdir /backup
fi

cd backup && tar -cvf - -- * | gzip -9 > /backup/backup_"$(date +'%H-%M_%d-%m-%Y').tar.gz" && cd ..

rm -rf backup

echo "=== BACKUP COMPLETED at $(date) ==="
echo "Backup file created: /backup/backup_$(date +'%H-%M_%d-%m-%Y').tar.gz"
ls -la /backup/backup_*.tar.gz | tail -5

#delete old backups if configured
if [ -n "${BACKUP_COUNT}" ]; then
  cd /backup
  if [ "$(find . -name "backup_*.tar.gz" | wc -l)" -gt "${BACKUP_COUNT}" ]; then
    find . -name "backup_*.tar.gz" -type f -printf '%T@ %p\n' | sort -rn | tail -n +$((BACKUP_COUNT + 1)) | cut -d' ' -f2- | xargs -r rm -f
  fi
fi