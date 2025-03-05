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
- after clearing all tables , drop all constrains
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
- If you're in development and don't mind losing data, you can:
    ```bash
       
        # Reset the database completely
        npx prisma migrate reset --force
    ```