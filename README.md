
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

To run this project, you will need to add the following environment variables to your .env file. See deployment/.env.sample

`HOST`

`PORT`

`admin_wallet` ? TBD

### Proxy settings / Lets Encrypt
Used in the proxy to define the target for the requests. Obsolet in local deployment.

`FRONTEND_URL`

`BACKEND_URL`

`LETSENCRYPT_EMAIL`

### Database

`DB_USER` Database-User

`DB_PASSWORD` Password for the Database-User

`DB_NAME` Name of the Database

### Backend
//TODO split this

`DATABASE_URL` define the url for the postgres-connection used by the prisma client (`postgres://<user>:<password>@<host>:<post>/<database>`)

`SERVER_MNEMONIC` ?

### Twilio
`TWILIO_ACCOUNT_SID`

`TWILIO_AUTH_TOKEN`

`TWILIO_VERIFY_SERVICE_SID`

### Backup
`BACKUP_CRON` (cron expression e.g. `* * * * *`) set how often the server create an backup

`BACKUP_COUNT` define how many backups sould we create befor delte the oldest one

### e2e (playwright)
`BASE_URL` Set the URL for the Playwright runner to execute the tests against this URL.

## Backup and Restore
### Backup
You can find the script which creates the backup under `actionfiles/aquafier-ts/script/create_backup.sh`. Depending on the `BACKUP_CRON` this file will be called from a cron job.
This creation of the cron-job happend in the `actionfiles/aquafier-ts/script/start_aqua.sh` file. The backup file tries to copy everything from the Database and create a copy of the file source (filesystem or s3 storage) and create a tar.gz of this files. After the tar.gz was successfully created, you can find the Backup under /backup in the container. So you have two options to get this backup:

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

### Dev vs Prod vs Local
Dev and Prod are the same files only with diffrent docker image tags.
Local has no proxy/letsencrypt container and has exposed ports (for debugging reason).


## Build

We use Github-Actions to build our images. You can find the Workflow-Definition under `./github/workflows/build-docker.yml`. This image uses the dockerfile under `actionfiles/aquafier-ts/dockerfile/Dockerfile` to create an image and push this image to the github-registry. You can find this images under https://github.com/inblockio/aquafier-js/pkgs/container/aquafier-js. The Tag depends on the build-base and contains the commit sha. 

