#!/bin/bash

if [[ -z "${BACKEND_URL}" ]]; then
  export BACKEND_URL=http://127.0.0.1:3000
else
  export BACKEND_URL=https://${BACKEND_URL}
fi

# Replace backend URL placeholder in config
sed -i -e "s|BACKEND_URL_PLACEHOLDER|$BACKEND_URL|g" /app/frontend/config.json

# Start backend in the background
cd /app/backend
npm run dev &

# Serve frontend
cd /app/frontend
serve -s . -l 3600 &

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?