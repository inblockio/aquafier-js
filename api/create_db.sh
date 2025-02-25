#!/usr/bin/bash

# Start PostgreSQL command line interface
echo "Starting PostgreSQL command line interface..."
sudo -u postgres psql <<EOF

CREATE DATABASE aquafier_js;
CREATE USER aquafier_js WITH ENCRYPTED PASSWORD 'aquafier_js' CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE aquafier_js TO aquafier_js;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO aquafier_js;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO aquafier_js;
GRANT postgres TO aquafier_js;

ALTER USER aquafier_js WITH CREATEDB;
EOF

# Exit PostgreSQL command line interface
echo "Exiting PostgreSQL command line interface..."