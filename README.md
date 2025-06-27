## Aquafiier Js Project.
A tool that illustrates the capability & utility of Aqua protocol.

## Getting started 
The api project structure is inspired by laravel project layout.<br/> The project is a fastify project with prisma ord (psql db).<br/><br/>
The web project is a react(typescript) project using chackra ui.

## Running 
To run the api, navigate to api directory.
1. `create .env from .env.sample`, edit the db credentials.
2. `npm i` to install dependancies
3. run prisma db migration `npx prisma migrate dev` : Tip run `npx prisma generate` when you change `schema.prisma`
4. `npm run dev` to start http server


## Database creation
To create a database use the `create_db.sh`. Update the file with the config to use.
```bash
chmod +x ./create_db.sh
```


## Deployment
check out [docker.md](./docker.md) 
