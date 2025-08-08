#!/bin/bash

set -ex

if [ -d  "/restore" ]; then
files=$(find /restore -name "backup*.tar.gz")
count=$(find /restore -name "backup*.tar.gz"| wc -l)

if [ "${count}" -eq 1 ]; then
  echo "found backup!"
  if [ -z "${RESTORE_BACKUP}" ] && [ "${RESTORE_BACKUP}" != "true" ]; then
      echo "Please set RESTORE_BACKUP=true if you want to restore the backup. But be careful: this will delete all files!"
      exit 1;
  fi
   if [ -n "${RESTORE_BACKUP}" ] && [ "${RESTORE_BACKUP}" == "true" ]; then

      backupFile=${files[0]}

      if [ -d "/restore/workdir" ]; then
          rm -rf /restore/workdir
      fi

      mkdir /restore/workdir
      tar -xvf "${backupFile}" -C /restore/workdir

      cd /restore/workdir/

     if [ -z "${DB_PASSWORD}" ] && [ -z "${DB_USER}" ] && [ -z "${DB_NAME}" ]; then
       echo "Missing database creds"
       exit 1;
     fi

      #TODO split up the url and add the host here
      PGPASSWORD=${DB_PASSWORD} psql -U "${DB_USER}" -h postgres -d postgres -c "drop database IF EXISTS ${DB_NAME} (force);"
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
          else
            echo "Bucket does not exists! Create them!"
            /mc mb "restoreDestination/${S3_BUCKET}"
          fi

          /mc rm -r --force "restoreDestination/${S3_BUCKET}"

          /mc cp /restore/workdir/s3/* "restoreDestination/${S3_BUCKET}/"
        fi
      fi

      if [ -d "/restore/workdir/filesystem" ]; then
        if [ -d "/app/api/media" ]; then
          rm --interactive=never /app/backup/media/*
        else
          mkdir -p /app/backup/media
        fi
          cp /restore/workdir/filesystem/* /app/backup/media
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