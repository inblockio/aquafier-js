# Commands to run when installing on a vps
Its advisable to use a new user in the context we will use the user, app,
We will be using docker to run the aquafier  instance.

1. install docker , https://docs.docker.com/engine/install
2. clone the repo `git clone https://github.com/inblockio/aquafier-js.git`
3. create .env 
    - `cd /aquafier-js/deployment ` 
    - `cp .env.sample .env`
    -  remember to update the environement variables for example 
        a. db credentials, 
        b. s3 credntials if not present  the system will defult to store data in the volume
        c. `BACKEND_URL`   and `FRONTEND_URL` .We advise to use -api for backend url for example using the api `aqua.org` for the  front end `app.aqua.org` for the backend `app-api.aqua.org`
        d. `SERVER_MNEMONIC` some claim require server wallets
        e. edit `ALLOWED_CORS`  with the backend and fronend  url 
        f. set `CUSTOM_LANDING_PAGE_URL` and `CUSTOM_LOGO_URL` to true if you don't want to use inblock landing page and logo. Use `CUSTOM_NAME` and `CUSTOM_DESCRIPTION` to set your own name and description
4. If changes have been made to github, pull the new image first ie `docker compose -f deployment/docker-compose-dev.yml pull`
5. run `docker compose -f deployment/docker-compose-dev.yml up` for bleeding edge or `docker compose -f deployment/docker-compose-prod.yml up` for stable builds
6. if you encounter an issue always start by checking logs `sudo docker logs {image id}`.