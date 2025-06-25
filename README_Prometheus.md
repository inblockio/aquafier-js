# Prometheus: Add README for aquafier-js

## Project Overview

Aquafiier is a comprehensive document management and verification platform that leverages blockchain technology to provide secure, transparent, and traceable document workflows. The project consists of multiple interconnected components designed to streamline document processing, signing, and collaboration.

### Key Features
- Blockchain-backed document versioning and tracking
- Secure file upload and management
- Advanced document revision and chain management
- Digital signature and attestation capabilities
- Workflow-based document processing
- Decentralized file exploration and verification

### Core Components
- **API Backend**: A Fastify-based server with Prisma ORM for database interactions
- **Web Interface**: A React (TypeScript) application using Chakra UI for intuitive user experience
- **Chain Flow**: Visualization and management of document revision chains
- **End-to-End Testing**: Comprehensive test suite to ensure platform reliability

### Supported Workflows
- Document signing
- Contract management
- Identity verification
- File sharing and collaboration
- Revision tracking and version control

The platform aims to solve challenges in document management by providing a secure, transparent, and efficient system for creating, tracking, and verifying digital documents across various use cases.

## Getting Started, Installation, and Setup

### Prerequisites

- Node.js (v16 or later recommended)
- npm or yarn
- PostgreSQL database
- Git

### Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/aquafiier-js.git
   cd aquafiier-js
   ```

2. Set up the API:
   ```bash
   cd api
   cp .env.sample .env
   # Edit .env with your database credentials
   npm install
   npx prisma generate
   npx prisma migrate dev
   npm run dev
   ```

3. Set up the Web Application:
   ```bash
   cd ../web
   cp .env.sample .env
   # Edit .env with any required configuration
   npm install
   npm run dev
   ```

### Development Setup

#### API Setup
- Location: `./api` directory
- Framework: Fastify with Prisma ORM
- Database: PostgreSQL

##### Database Initialization
1. Ensure PostgreSQL is installed
2. Create a new database
3. Update database credentials in `.env`
4. Run database migrations:
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

#### Web Application Setup
- Location: `./web` directory
- Framework: React with TypeScript
- UI Library: Chakra UI

### Production Build

#### API
```bash
cd api
npm run build
npm run start  # Start production server
```

#### Web Application
```bash
cd web
npm run build
# Use your preferred static file hosting or deployment method
```

### Docker Deployment

For comprehensive Docker deployment instructions, refer to the [docker.md](./docker.md) file in the project root.

### Additional Notes
- Always use `.env.sample` as a template for your environment configurations
- Ensure all dependencies are installed before running the application
- Database schema changes require running `npx prisma generate`