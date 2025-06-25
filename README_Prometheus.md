# Prometheus: Add README for aquafier-js

## Project Overview

Aquafier is a comprehensive document management and verification platform built around the Aqua protocol. The project provides a full-stack solution for secure document handling, revision tracking, and collaborative workflows across web and API interfaces.

### Key Features
- Robust document versioning and revision tracking
- Secure file management and sharing
- Workflow-based document processing
- Web interface with React and Chakra UI
- Backend API with Fastify and Prisma ORM
- Support for various document types and templates

### Core Capabilities
- Create, upload, and manage digital documents
- Implement document revision and version control
- Generate and sign digital forms
- Blockchain-inspired document verification
- Collaborative document workflows
- Flexible file exploration and management

The platform is designed to provide a secure, efficient, and user-friendly approach to digital document management, with a focus on traceability, integrity, and collaborative features.

## Getting Started, Installation, and Setup

### Prerequisites

- Node.js (recommended version specified in `.nvmrc`)
- npm or yarn
- PostgreSQL database
- A web browser for frontend
- Git

### Quick Start

This project consists of multiple components: an API, a web frontend, and a chain flow frontend.

#### API Setup

1. Navigate to the API directory:
   ```bash
   cd api
   ```

2. Create environment configuration:
   ```bash
   cp .env.sample .env
   ```
   Edit the `.env` file with your database credentials and other configuration settings.

3. Install dependencies:
   ```bash
   npm install
   ```

4. Initialize the database:
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

#### Web Frontend Setup

1. Navigate to the web directory:
   ```bash
   cd web
   ```

2. Create environment configuration:
   ```bash
   cp .env.sample .env
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

#### Chain Flow Frontend Setup

1. Navigate to the chain-flow directory:
   ```bash
   cd chain-flow
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

### Database Creation

Use the `create_db.sh` script in the API directory to create a database:

```bash
chmod +x api/create_db.sh
./api/create_db.sh
```

### Development Notes

- The project uses Prisma ORM with PostgreSQL
- Frontend is built with React and Chakra UI
- API is built with Fastify
- Remember to run `npx prisma generate` after changing `schema.prisma`

### Deployment

For detailed deployment instructions, refer to the `docker.md` file in the project root.