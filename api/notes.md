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

## Testing

https://www.youtube.com/watch?v=gq8ZQrBJb2M&t=640s&ab_channel=TomDoesTech