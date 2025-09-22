
# Start everything (migrations run automatically first)
docker-compose -f docker-compose-local.yml up -d

# View migration logs if needed
docker-compose -f docker-compose-local.yml logs migrate