#!/bin/bash
set -ex

FILE_STORAGE_PATH="/app/backend/media"

#load envs.... because this script runs in a cron-job we need to load the creds
if [ -f "/app/utils/env" ]; then
  source /app/utils/env
fi

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

#create dump of the s3 storage
if [ -n "${S3_USER}" ] && [ -n "${S3_PASSWORD}" ] && [ -n "${S3_BUCKET}" ] && [ -n "${S3_URL}" ]; then
  echo "start s3 backup!"
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


    /mc alias set backupSource "${URL}":"${PORT}" "${USER}" "${PASSWORD}" "${USE_SSL}"

    /mc mirror "backupSource/${BUCKET}" workdir

    #i need the files not the dir
    mkdir backup/s3
    mv workdir/* backup/s3

    rm -rf workdir
else
  echo "skipping s3 backup because of missing creds!"
fi


if [ -d "${FILE_STORAGE_PATH}" ]; then
    echo "start file backup!"+
    mkdir backup/filesystem
    cp "${FILE_STORAGE_PATH}"/* backup/filesystem
fi

if [ ! -d "/backup" ]; then
  mkdir /backup
fi

cd backup && tar -cvf - -- * | gzip -9 > /backup/backup_"$(date +'%H-%M_%d-%m-%Y').tar.gz" && cd ..

rm -rf backup

#delete old backups if configured
if [ -n "${BACKUP_COUNT}" ]; then
  cd /backup
  if [ "$(find . -name "backup_*.tar.gz" | wc -l)" -gt "${BACKUP_COUNT}" ]; then
    find . -name "backup_*.tar.gz" -type f -printf '%T@ %p\n' | sort -rn | tail -n +$((BACKUP_COUNT + 1)) | cut -d' ' -f2- | xargs -r rm -f
  fi
fi

