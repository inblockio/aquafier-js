#!/bin/bash

# Start PostgreSQL command line interface
echo "Starting PostgreSQL command line interface..."
sudo -u postgres psql -d postgres <<EOF

CREATE DATABASE aquafier_js1;
CREATE USER aquafier_js1 WITH ENCRYPTED PASSWORD 'aquafier_js1' CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE aquafier_js1 TO aquafier_js1;

-- Connect to the aquafier_js1 database to grant schema permissions
\c aquafier_js1

-- Grant schema-level permissions
GRANT ALL ON SCHEMA public TO aquafier_js1;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO aquafier_js1;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO aquafier_js1;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO aquafier_js1;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO aquafier_js1;

-- Optional: superuser privileges if needed
-- ALTER USER aquafier_js1 WITH SUPERUSER;
EOF

# Exit PostgreSQL command line interface
echo "Exiting PostgreSQL command line interface..."
