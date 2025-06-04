#!/usr/bin/bash

# Start PostgreSQL command line interface
echo "Starting PostgreSQL command line interface..."
sudo -u postgres psql <<EOF

CREATE DATABASE aquafier_js;
CREATE USER aquafier_js WITH ENCRYPTED PASSWORD 'aquafier_js' CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE aquafier_js TO aquafier_js;

-- Connect to the aquafier_js database to grant schema permissions
\c aquafier_js

-- Grant schema-level permissions
GRANT ALL ON SCHEMA public TO aquafier_js;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO aquafier_js;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO aquafier_js;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO aquafier_js;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO aquafier_js;

-- Optional: superuser privileges if needed
-- ALTER USER aquafier_js WITH SUPERUSER;
EOF

# Exit PostgreSQL command line interface
echo "Exiting PostgreSQL command line interface..."

