
# Aquafier-js

Aquafier-JS is a reference implementation of the Aqua Protocol, demonstrating how its features can be integrated into modern web and backend applications.
The project enables digital content signing, provenance verification, and integrity validation, serving as an example for real-world Aqua use cases.

Technically, Aquafier-JS combines a Fastify backend with Prisma and PostgreSQL, alongside a React frontend (TypeScript, Chakra UI). End-to-end testing is implemented using Playwright to ensure high software quality.
Its modular architecture makes it a solid foundation for custom applications or proof-of-concepts.


## Authors

- [@Tim Bansemer](https://github.com/FantasticoFox) Project-Manager
- [@Arthur Kamau](https://github.com/Arthur-Kamau) Developer
- [@Dalmas Nyaboga Ogembo](https://github.com/dalmasonto) Developer
- [@Florian Zeps](https://github.com/Zusel) DevOps
- [Renovate](https://docs.renovatebot.com/)


## Environment Variables

Copy `api/.env.sample` to `api/.env` and fill in the values. The sections below describe each group.

### Core

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server listen port | `3000` |
| `HOST` | Server hostname | `localhost` |
| `BACKEND_URL` | Public URL of the backend (used in payments, revisions) | — |
| `FRONTEND_URL` | Public URL of the frontend (used in CORS) | — |
| `DATABASE_URL` | PostgreSQL connection string for Prisma (`postgresql://user:pass@host:5432/db`) | — |
| `ALLOWED_CORS` | Comma-separated list of allowed CORS origins | — |
| `ALCHEMY_API_KEY` | Alchemy API key for blockchain interactions | — |
| `SERVER_MNEMONIC` | Server wallet mnemonic | — |
| `DEFAULT_WITNESS_NETWORK` | Default network for witnessing | — |
| `ENABLE_DBA_CLAIM` | Enable DBA claim functionality | — |
| `DASHBOARD_WALLETS` | Comma-separated wallet addresses for admin dashboard access | — |

### S3 / Storage (optional)

S3 is disabled when these variables are not set. The server falls back to local filesystem storage.

| Variable | Description | Default |
|---|---|---|
| `S3_USER` | Minio/S3 access key | — |
| `S3_PASSWORD` | Minio/S3 secret key | — |
| `S3_URL` | Minio/S3 endpoint | — |
| `S3_PORT` | Minio/S3 port | `9000` |
| `S3_USE_SSL` | Use SSL for S3 connection | `true` |
| `S3_BUCKET` | S3 bucket name | `aquafier` |
| `UPLOAD_DIR` | Local upload directory (used as fallback) | — |

### Twilio

Used for SMS/email verification when creating claims.

| Variable | Description |
|---|---|
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_VERIFY_SERVICE_SID` | Twilio Verify service SID |

### Elasticsearch (optional)

Only needed if you want search indexing. Not required to run the server.

| Variable | Description |
|---|---|
| `ELASTIC_NODE` | Elasticsearch node URL |
| `ELASTIC_NODE_USERNAME` | Elasticsearch username |
| `ELASTIC_NODE_PASSWORD` | Elasticsearch password |

### Tracing (optional)

| Variable | Description |
|---|---|
| `TRACING_ENABLE` | Enable OpenTelemetry tracing |
| `TRACING_SERVICE_NAME` | Service name for traces |

### Payment System

| Variable | Description | Default |
|---|---|---|
| `ENABLE_CRYPTO_PAYMENTS` | Enable crypto payment method | `true` |
| `ENABLE_STRIPE_PAYMENTS` | Enable Stripe payment method | `false` |
| `DEFAULT_PAYMENT_METHOD` | Default payment method (`CRYPTO` or `STRIPE`) | `CRYPTO` |
| `STRIPE_SECRET_KEY` | Stripe secret key | — |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | — |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | Stripe price ID for Pro monthly | — |
| `STRIPE_PRO_YEARLY_PRICE_ID` | Stripe price ID for Pro yearly | — |
| `STRIPE_ENTERPRISE_MONTHLY_PRICE_ID` | Stripe price ID for Enterprise monthly | — |
| `STRIPE_ENTERPRISE_YEARLY_PRICE_ID` | Stripe price ID for Enterprise yearly | — |
| `NOWPAYMENTS_API_KEY` | NOWPayments API key | — |
| `NOWPAYMENTS_IPN_SECRET` | NOWPayments IPN secret | — |
| `DEFAULT_FREE_PLAN_ID` | Free plan UUID (auto-resolved from DB if not set) | — |
| `TRIAL_PERIOD_DAYS` | Trial period length in days | `14` |

### Proxy / Lets Encrypt (deployment only)

Used by the reverse proxy in dev/prod deployments. Not needed for local development.

| Variable | Description |
|---|---|
| `FRONTEND_URL` | Target for frontend proxy |
| `BACKEND_URL` | Target for backend proxy |
| `LETSENCRYPT_EMAIL` | Email for Let's Encrypt certificates |

### Backup (deployment only)

| Variable | Description |
|---|---|
| `BACKUP_CRON` | Cron expression for backup schedule (e.g. `0 2 * * *`) |
| `BACKUP_COUNT` | Number of backups to retain before deleting the oldest |

### e2e (Playwright)

| Variable | Description |
|---|---|
| `BASE_URL` | URL the Playwright test runner executes against |

## Backup and Restore
### Backup
You can find the script that creates the backup under `actionfiles/aquafier-ts/script/create_backup.sh`. Depending on the `BACKUP_CRON`, this file will be called from a cron job.
This creation of the cron-job happens in the `actionfiles/aquafier-ts/script/start_aqua.sh` file.

1. `docker cp <docker container id>:/backup/<backup-file-name>.tar.gz .`
2. create a mount volume from you host in the docker-compose-<env>.yml

### Restore
On startup the container checks if there is a backup file under /restore. If the server can find one, the server will performs several checks. For example the server will check if there is a specific env-var to prevent "ups backup restored" situations. So this is the reason why i dont document this var here. After this check is successfully, the server performs a version check. Checks if the version of the backup file is the same as the Server-Version. If this matches, the server will start dropping the database and restore the backup. The same prodecuer with the s3 storage and the filesystem storage.

## Deployment

### Requirements
- Docker-Compose Plugin
- Dockerd

### How to deploy

We are committed to making the deployment process as simple as possible. For dev/prod deployments, an additional DNS entry is required, but otherwise the deployments are identical.

1. prepare you .env file (typically in your work dir)
2. (prod/dev) prepare your DNS
3. `docker compose -f deployment/docker-compose-<local|dev|prod>.yml up` (with a -d you can detach from the startup process)

check `install.md` for more a verbose explanation of the above steps.

### Dev vs Prod vs Local
Dev and Prod are the same files only with diffrent docker image tags.
Local has no proxy/letsencrypt container and has exposed ports (for debugging reason).


## Build

We use Github-Actions to build our images. You can find the Workflow-Definition under `./github/workflows/build-docker.yml`. This image uses the dockerfile under `actionfiles/aquafier-ts/dockerfile/Dockerfile` to create an image and push this image to the github-registry. You can find this images under https://github.com/inblockio/aquafier-js/pkgs/container/aquafier-js. The Tag depends on the build-base and contains the commit sha. 

To build locally use `NODE_OPTIONS="--max-old-space-size=4096" npm run build ` in web and api folder, this will generate dist files for you.

## Contribution

Please check the [CONTRIBUTION.md](CONTRIBUTION.md) file for more information on how to contribute to the project.
   