# API Backend

Fastify backend server with Prisma ORM and PostgreSQL database.

## Development

### Quick Start
```bash
npm install
npm run dev    # Watch mode with tsx
```

### Building
```bash
npm run build  # Compile TypeScript to dist/
npm start      # Run production build
```

### Testing
```bash
npm test       # Run tap unit tests
```

## Database (Prisma)

### After Schema Changes

Anytime you modify `prisma/schema.prisma`, you must regenerate the Prisma client:

```bash
# Regenerate Prisma client only (no DB changes)
npx prisma generate

# Apply migrations and regenerate client
npx prisma migrate dev

# Reset database (WARNING: destroys all data)
npx prisma migrate reset

# Then rebuild the application
npm run build
```

### Common Workflow

1. **Modify schema**: Edit `prisma/schema.prisma`
2. **Create migration**: `npx prisma migrate dev --name describe_your_change`
3. **Regenerate client**: Happens automatically with migrate, or run `npx prisma generate`
4. **Rebuild**: `npm run build`

### Troubleshooting

If you see TypeScript errors like `Property 'modelName' does not exist on type 'PrismaClient'`:
- Run `npx prisma generate` to regenerate the client
- Then run `npm run build`

## Docker

### Start everything (migrations run automatically first)
```bash
docker-compose -f docker-compose-local.yml up -d
```

### View migration logs if needed
```bash
docker-compose -f docker-compose-local.yml logs migrate
```