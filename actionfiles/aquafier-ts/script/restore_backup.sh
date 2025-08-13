#!/bin/bash

set -ex

if [ -d  "/restore" ]; then
files=$(find /restore -maxdepth 1 -name "backup*.tar.gz")
count=$(find /restore -maxdepth 1 -name "backup*.tar.gz"| wc -l)

if [ "${count}" -eq 1 ]; then
  echo "found backup!"
  if [ -z "${RESTORE_BACKUP}" ] && [ "${RESTORE_BACKUP}" != "true" ]; then
      echo "Please set RESTORE_BACKUP=true if you want to restore the backup. But be careful: this will delete all files!"
      exit 1;
  fi
   if [ -n "${RESTORE_BACKUP}" ] && [ "${RESTORE_BACKUP}" == "true" ]; then

      backupFile=$(echo "$files" | head -n1)

      if [ -d "/restore/workdir" ]; then
          rm -rf /restore/workdir
      fi

      mkdir /restore/workdir
      tar -xvf "${backupFile}" -C /restore/workdir


      backup_hash=$(jq -r '.commitHash' /restore/workdir/version-info.json 2>/dev/null || echo "unknown")
      server_hash=$(jq -r '.commitHash' /app/version-info.json 2>/dev/null || echo "unknown")
      if [ "$backup_hash" != "$server_hash" ]; then
          printf "Aquafier commit-hash does not match!\nbackup: %s\nserver: %s\n" "$backup_hash" "$server_hash"
      fi

      cd /restore/workdir/

     if [ -z "${DB_PASSWORD}" ] && [ -z "${DB_USER}" ] && [ -z "${DB_NAME}" ]; then
       echo "Missing database creds"
       exit 1;
     fi

      #TODO split up the url and add the host here
      PGPASSWORD="${DB_PASSWORD}" psql -U "${DB_USER}" -h postgres -d postgres -c "DROP DATABASE IF EXISTS \"${DB_NAME}\";"
      PGPASSWORD=${DB_PASSWORD} psql -U "${DB_USER}" -h postgres -d postgres -c "CREATE DATABASE ${DB_NAME};"
      PGPASSWORD=${DB_PASSWORD} psql -U "${DB_USER}" -h postgres -d "${DB_NAME}" < backup.sql
      echo "Successfully restored the database!"

      # check if s3 restore is necessary
      if [ -d "/restore/workdir/s3" ]; then
        # check if all creds are present
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


          #restore the s3 storage
          /mc alias set restoreDestination "${URL}":"${PORT}" "${USER}" "${PASSWORD}" "${USE_SSL}"

          if /mc stat "restoreDestination/${S3_BUCKET}" > /dev/null 2>&1; then
            echo "bucket exists! RESET"
            /mc rm -r --force "restoreDestination/${S3_BUCKET}"
            /mc mb "restoreDestination/${S3_BUCKET}"
          else
            echo "Bucket does not exists! Create them!"
            /mc mb "restoreDestination/${S3_BUCKET}"
          fi

          /mc cp /restore/workdir/s3/* "restoreDestination/${S3_BUCKET}/"
        fi
      fi

      if [ -d "/restore/workdir/filesystem" ]; then
        if [ -d "/app/backend/media" ]; then
          rm --interactive=never /app/backend/media/*
        else
          mkdir -p /app/backend/media
        fi
          if [ "$(ls -A /restore/workdir/filesystem 2>/dev/null)" ]; then
            cp /restore/workdir/filesystem/* /app/backend/media/
          fi
      fi

      if [ ! -d "/restore/imported" ]; then
          mkdir /restore/imported;
      fi

      mv "$backupFile" /restore/imported;
      rm -rf /restore/workdir
      echo "Finished restoring backup file!"
  fi
fi
fi