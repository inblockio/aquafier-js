#!/bin/bash

export S3_USER=aquafier
export S3_PASSWORD=supersafepassword123
export S3_BUCKET=test
export S3_URL=http://localhost

#backup the sqls
PGPASSWORD=${POSTGRES_PASSWORD} pg_dump -U ${POSTGRES_USER} -h postgres -p 5432 ${POSTGRES_DB} > backup.sql

#create dump of the s3 storage
if [ -n "${S3_USER}" ] && [ -n "${S3_PASSWORD}" ] && [ -n "${S3_BUCKET}" ] && [ -n "${S3_URL}" ]; then
    USER=${S3_USER}
    PASSWORD=${S3_PASSWORD}
    BUCKET=${S3_BUCKET}
    URL=${S3_URL}
    USE_SSL=${S3_USE_SSL:-false}
    PORT=${S3_PORT:-9000}

    if [ "${USE_SSL}" = "true" ]; then
      USE_SSL=""
    else
      USE_SSL="--insecure"
    fi

    mkdir workdir

    mc alias set backupSource "${URL}":"${PORT}" "${USER}" "${PASSWORD}" "${USE_SSL}"

    mc mirror backupSource/${BUCKET} workdir

    tar -I 'xz -9 -T0' -cf file_backup.tar.xz workdir

    rm -rf workdir
else
  echo "Skipping s3 because there are missing creds!"
fi




