module.exports = {
    apps: [{
      name: "my-fastify-app",
      script: "npm",
      args: "run dev",
      instances: "max",
      exec_mode: "cluster",
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production"
      }
    }]
  }