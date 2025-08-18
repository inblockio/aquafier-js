## Quick commands
- incse prisma has issues run this command to drop all tables
    ```sql
        DO $$ 
        DECLARE
            r RECORD;
        BEGIN
            FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema()) LOOP
                EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
            END LOOP;
        END $$;
    ```
- after dropping all tables , drop all constrains
    ```sql
                DO $$
        DECLARE
            r RECORD;
        BEGIN
            -- Drop foreign key constraints
            FOR r IN (
                SELECT 
                    tc.table_schema, 
                    tc.constraint_name, 
                    tc.table_name, 
                    kcu.column_name
                FROM 
                    information_schema.table_constraints tc
                JOIN 
                    information_schema.key_column_usage kcu 
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.table_schema = kcu.table_schema
                WHERE 
                    tc.constraint_type = 'FOREIGN KEY'
            ) LOOP
                EXECUTE 'ALTER TABLE ' || quote_ident(r.table_schema) || '.' || quote_ident(r.table_name) || 
                        ' DROP CONSTRAINT ' || quote_ident(r.constraint_name) || ';';
            END LOOP;

            -- Drop unique constraints
            FOR r IN (
                SELECT 
                    tc.table_schema, 
                    tc.constraint_name,
                    tc.table_name
                FROM 
                    information_schema.table_constraints tc
                WHERE 
                    tc.constraint_type = 'UNIQUE'
            ) LOOP
                EXECUTE 'ALTER TABLE ' || quote_ident(r.table_schema) || '.' || quote_ident(r.table_name) || 
                        ' DROP CONSTRAINT ' || quote_ident(r.constraint_name) || ';';
            END LOOP;

            -- Drop primary key constraints
            FOR r IN (
                SELECT 
                    tc.table_schema, 
                    tc.constraint_name, 
                    tc.table_name
                FROM 
                    information_schema.table_constraints tc
                WHERE 
                    tc.constraint_type = 'PRIMARY KEY'
            ) LOOP
                EXECUTE 'ALTER TABLE ' || quote_ident(r.table_schema) || '.' || quote_ident(r.table_name) || 
                        ' DROP CONSTRAINT ' || quote_ident(r.constraint_name) || ';';
            END LOOP;
        END $$;
    ```
- To clear all the data in all the tables 
    ```sql
        DO $$
        DECLARE
            tables CURSOR FOR
                SELECT tablename
                FROM pg_tables
                WHERE schemaname = 'public'
                ORDER BY tablename;
            
            truncate_statement TEXT;
            table_record RECORD;
        BEGIN
            -- Temporarily disable foreign key constraints to avoid relationship conflicts
            EXECUTE 'SET session_replication_role = replica;';
            
            -- First pass: Collect all table names
            CREATE TEMP TABLE IF NOT EXISTS table_list (
                table_name TEXT
            );
            
            FOR table_record IN tables LOOP
                INSERT INTO table_list VALUES (table_record.tablename);
            END LOOP;
            
            -- Second pass: Truncate all tables
            FOR table_record IN SELECT table_name FROM table_list LOOP
                truncate_statement := 'TRUNCATE TABLE "' || table_record.table_name || '" CASCADE;';
                
                BEGIN
                    EXECUTE truncate_statement;
                    RAISE NOTICE 'Truncated table: %', table_record.table_name;
                EXCEPTION WHEN OTHERS THEN
                    RAISE WARNING 'Failed to truncate table %: %', table_record.table_name, SQLERRM;
                END;
            END LOOP;
            
            -- Clean up
            DROP TABLE IF EXISTS table_list;
            
            -- Re-enable foreign key constraints
            EXECUTE 'SET session_replication_role = DEFAULT;';
            
            RAISE NOTICE 'All tables have been emptied.';
        END $$;
    ```



- If you're in development and don't mind losing data, you can:
    ```bash
       
        # Reset the database completely
        npx prisma migrate reset --force
    ```

## Quick helpful debug queries

```sql
select pubkey_hash from revision;
select file_hash, reference_count from file;
select file_hash, reference_count from file_index;
```
## postgres in docker  docker 

1. ` docker  ps` -> list images
2. ` docker exec -it aquafier-postgres psql -U {user name in .env}`



## Going into a docker container

if you want to go inside the deployment-aqua-container container and explore its filesystem, you can use docker exec with a shell

->  `docker exec -it deployment-aqua-container-1 sh`

## checkinfg the env and container/image details
-> `docker compose --file .\deployment\docker-compose-local.yml config`

## delet volume
-> `docker compose --file .\deployment\docker-compose-local.yml down --volumes --remove-orphans`
-> `docker compose --file .\deployment\docker-compose-local.yml up --build --force-recreate`

## 1. Remove Docker Volumes
Even though you deleted the bind mount directory, PostgreSQL data might be stored in Docker volumes:

```cmd
docker-compose  --file .\deployment\docker-compose-local.yml  down -v
```

The `-v` flag removes all volumes associated with the services.

## 2. Remove Any Named Volumes (if they exist)
Check for any Docker volumes:
```cmd
docker volume ls
```

Remove any volumes related to your project:
```cmd
docker volume rm deployment_postgres_data
```
(Replace with actual volume name if different)

## 3. Remove Container Data Completely
Since PostgreSQL stores its data internally, you may need to:

```cmd
docker-compose down
docker system prune -a --volumes
```

**Warning**: This removes ALL unused Docker data system-wide.

## 4. Alternative: Target Specific Components
If you want to be more selective:

```cmd
# Stop and remove containers
docker-compose down

# Remove specific containers
docker rm aquafier-postgres deployment-aqua-container-1 deployment-s3storage-1

# Remove specific images (optional)
docker rmi postgres:17

# Start fresh
docker-compose up
```

## 5. Verify Clean State
After running the above commands:
1. Recreate the mount directory: `mkdir dev_mount_points\aquafier`
2. Start the services: `docker-compose up`

The issue is that PostgreSQL data persists in the container's internal storage even when bind mounts are removed. The `-v` flag with `docker-compose down` should resolve this.