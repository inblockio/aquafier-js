
## On bare metan
run `npm i && npx prisma migrate &&  npm run dev`

# Start everything (migrations run automatically first)
docker-compose -f docker-compose-local.yml up -d

# View migration logs if needed
docker-compose -f docker-compose-local.yml logs migrate