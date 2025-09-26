# Simple Migration Setup

This is a straightforward approach where migrations run automatically as part of the Docker Compose startup process.

## How It Works

1. **Dockerfile Changes**: 
   - Copies Prisma schema files to `/app/backend/prisma`
   - Includes a simple migration script `/app/simple_migrate.sh`
   - Generates Prisma client during build

2. **Docker Compose Changes**:
   - Added a `migrate` service that runs first
   - Main `aqua-container` waits for migration to complete successfully
   - Migration service runs once and exits

## Usage

### Development
```bash
# Start everything (migrations run automatically first)
docker-compose -f docker-compose-dev.yml up -d

# View migration logs
docker-compose -f docker-compose-dev.yml logs migrate
```

### Production
```bash
# Start everything (migrations run automatically first)
docker-compose -f docker-compose-prod.yml up -d

# View migration logs
docker-compose -f docker-compose-prod.yml logs migrate
```

## Migration Process

1. Database starts and becomes healthy
2. Migration container starts and runs `./simple_migrate.sh`:
   - Waits for database connection
   - Generates Prisma client
   - Runs `npx prisma migrate deploy`
   - Exits with success/failure
3. Main application starts only if migration succeeded

## Benefits

- ✅ **Simple**: Just run `docker-compose up -d`
- ✅ **Automatic**: Migrations happen before app starts
- ✅ **Safe**: App won't start if migrations fail
- ✅ **Clean**: Uses proper production migration command
- ✅ **Reliable**: No race conditions between containers

## Troubleshooting

### Migration Fails
```bash
# Check migration logs
docker-compose logs migrate

# Restart just the migration
docker-compose up migrate
```

### Reset Everything (Development)
```bash
# Stop and remove everything including volumes
docker-compose -f docker-compose-dev.yml down -v

# Start fresh
docker-compose -f docker-compose-dev.yml up -d
```

## Files Modified

1. **`actionfiles/aquafier-ts/dockerfile/Dockerfile`** - Added Prisma files and migration script
2. **`actionfiles/aquafier-ts/script/simple_migrate.sh`** - Simple migration script
3. **`deployment/docker-compose-dev.yml`** - Added migration service
4. **`deployment/docker-compose-prod.yml`** - Added migration service
