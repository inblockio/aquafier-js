Here are the standard commands to run your Docker Compose configuration:

1. Build the Docker images:
```bash
docker-compose build
```
This will build the images for all services defined in your docker-compose.yml file.

2. Start the containers:
```bash
docker-compose up -d
```
The `-d` flag runs the containers in detached mode (in the background).

Additional useful commands:

- To stop the containers:
```bash
docker-compose down
```

- To view logs:
```bash
docker-compose logs
```

- To view logs of a specific service:
```bash
docker-compose logs aqua-container
```

- To restart a specific service:
```bash
docker-compose restart aqua-container
```

If you want to rebuild and restart:
```bash
docker-compose up -d --build
```

A few tips:
- Make sure you're in the directory containing the `docker-compose.yml` file when running these commands
- Ensure you have Docker and Docker Compose installed
- Check that your `.env` file is properly configured with all necessary environment variables

## incase of any errors 
1. Ensure proper permissions:
    ```bash
    chmod 666 /var/run/docker.sock
    ```
    Note: This is a temporary solution and not recommended for production.

2. Add your user to the docker group (recommended):
    ```
        sudo usermod -aG docker $USER
    ```