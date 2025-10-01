# Aquafier-JS Codebase Overview

## Project Description

Aquafier-JS is a reference implementation of the Aqua Protocol, demonstrating how its features can be integrated into modern web and backend applications. The project enables digital content signing, provenance verification, and integrity validation through blockchain-based attestations.

**Tech Stack:**
- Backend: Fastify 5.2, Prisma 6.4, PostgreSQL 17
- Frontend: React 19, TypeScript, Radix UI, Tailwind CSS 4
- Testing: Playwright (E2E), tap (unit tests)
- Deployment: Docker Compose, GitHub Actions CI/CD

**Live Instances:**
- Production: https://aquafier.inblock.io
- Development: https://dev.inblock.io

## Repository Structure

```
aquafier-js/
├── api/                    # Backend API server (Fastify + Prisma)
│   ├── src/
│   │   ├── controllers/    # API route controllers (19 files, 5,109 lines)
│   │   ├── utils/          # Utility functions (17 files)
│   │   ├── models/         # Type definitions and models
│   │   ├── middleware/     # Authentication middleware
│   │   ├── database/       # Prisma client initialization
│   │   ├── index.ts        # Server entry point
│   │   └── server.ts       # Fastify server setup (172 lines)
│   ├── prisma/
│   │   └── schema.prisma   # Database schema (22 models)
│   ├── test/               # tap unit tests
│   └── package.json        # aquafier-ts v1.0.0
├── web/                    # React frontend (~34,520 lines)
│   ├── src/
│   │   ├── components/     # React components (34 items)
│   │   │   ├── aqua_chain_actions/  # Chain operations (14 files)
│   │   │   ├── aqua_forms/          # Form components (9 files)
│   │   │   ├── dropzone_file_actions/ # File uploads (8 files)
│   │   │   ├── ui/                  # Reusable UI (39 components)
│   │   │   └── ...
│   │   ├── pages/          # Page components (23 items)
│   │   ├── layouts/        # Layout components
│   │   ├── utils/          # Utility functions (9 files)
│   │   ├── models/         # Frontend models (11 files)
│   │   ├── types/          # TypeScript types (6 files)
│   │   ├── hooks/          # React hooks
│   │   ├── main.tsx        # App entry point
│   │   ├── App.tsx         # Main app component with routing
│   │   └── store.ts        # Zustand store (9,912 lines)
│   └── package.json        # aquafier-web v0.0.0
├── chain-flow/             # Workflow visualization component
│   └── src/                # React Flow visualization
│       └── components/flow/HierarchicalChain.tsx
├── e2e/                    # Playwright E2E tests
│   ├── cases/
│   │   └── tests.spec.ts   # Test specifications
│   ├── testUtils.ts        # Test utilities with MetaMask
│   ├── playwright.config.ts
│   └── resources/          # Test resources
├── deployment/             # Docker deployment configs
│   ├── docker-compose-local.yml   # Local dev (exposed ports)
│   ├── docker-compose-dev.yml     # Dev env (with proxy)
│   ├── docker-compose-prod.yml    # Production (stable)
│   └── .env.sample         # Environment variables template
├── actionfiles/            # Docker build files
│   └── aquafier-ts/dockerfile/Dockerfile
├── docs/                   # Documentation
│   ├── DocSigning.md       # Document signing feature
│   └── docker.md           # Docker documentation
├── bruno/                  # API testing collection
├── .github/workflows/      # CI/CD pipelines
│   └── build-docker.yml    # Docker build & deploy
└── README.md               # Main documentation
```

## Core Components

### Backend (api/)

**Main Entry Points:**
- `src/index.ts` - Server entry point, starts Fastify
- `src/server.ts:36-172` - Fastify server configuration
  - Body limit: 50MB, multipart: 200MB, timeout: 2 minutes
  - Sentry error tracking & profiling
  - CORS, multipart uploads, WebSocket, static files
  - Request logging with Winston (ECS format)

**Key Controllers:**
1. `authController` (auth.ts:228) - SIWE authentication, session management
2. `userController` (user.ts:790) - User management, ENS names, attestation addresses
3. `filesController` (files.ts:266) - File upload/download, S3 storage
4. `revisionsController` (revisions.ts:425) - Version control, revision history
5. `explorerController` (explorer.ts:913) - Chain exploration (largest controller)
6. `verifyController` (verify.ts:241) - Content/file/tree/DNS verification
7. `templatesController` (templates.ts:350) - Template CRUD operations
8. `shareController` (share.ts:518) - Sharing & contracts
9. `chequeApiController` (chequeApi.ts:151) - Cheque operations
10. `notificationsController` (notifications.ts:191) - User notifications
11. `webSocketController` (websocketController.ts:201) - Real-time updates
12. `fetchChainController` (fetch-chain.ts:54) - Blockchain data fetching
13. `DNSClaimVerificationController` (dns_claim_verification.ts:97) - DNS verification
14. `apiController` (api.ts:488) - General API endpoints
15. `systemController` (system.ts:137) - System operations

**Key Dependencies:**
- fastify 5.2.1 - Web framework
- @prisma/client 6.4.1 - Database ORM
- ethers 6.15.0 - Blockchain interaction
- aqua-js-sdk 3.2.1-44 - Aqua Protocol SDK
- siwe 3.0.0 - Sign-In With Ethereum
- @fastify/multipart 9.0.3 - File uploads
- minio 8.0.5 - S3 storage
- @fastify/websocket 11.1.0 - Real-time
- @sentry/node 10.5.0 - Error tracking
- winston 3.17.0 - Logging
- twilio 5.7.1 - SMS verification
- jszip 3.10.1 - ZIP handling

**Database Models (Prisma - 22 models):**
- `Users` - User accounts (address, ens_name, email)
- `AquaTemplate` - Document templates
- `AquaTemplateFields` - Template field definitions
- `SiweSession` - Authentication sessions (nonce-based)
- `Contract` - Smart contracts/agreements
- `Latest` - Latest versions tracking
- `Revision` - Document revisions (Git-like)
- `File` - File storage metadata
- `FileIndex` - File indexing
- `FileName` - File names
- `Link` - Links between revisions
- `Signature` - Digital signatures
- `Witness` - Witness data
- `WitnessEvent` - Blockchain witness events
- `AquaForms` - Form data (JSON)
- `MerkleNodes` - Merkle tree nodes
- `Settings` - User settings (CLI keys, witness network, theme)
- `Notifications` - User notifications
- `UserAttestationAddresses` - Attestation addresses with trust levels
- `VerificationData` - Verification codes
- `VerificationAttempt` - Rate limiting
- `DNSClaimVerificationOne` - DNS claim tracking

### Frontend (web/)

**Main Entry Points:**
- `src/main.tsx` - React entry, renders `<App />`
- `src/App.tsx:6720` - Main app component with routing, Sentry, APM
- `src/store.ts:9912` - Zustand state management with IndexedDB persistence

**Key Components:**
- `connect_wallet_page.tsx` - Wallet connection (MetaMask, WalletConnect)
- `aqua_chain_actions/` - Chain operations (attest, sign, witness, share, link, delete)
- `aqua_forms/` - Form system
  - `CreateFormFromTemplate.tsx:107474` - Form creation (needs refactoring)
  - `FormTemplateEditorShadcn.tsx` - Template editor
  - `FormTemplateListShadcn.tsx` - Template list
  - `FormTemplateViewer.tsx` - Template viewer
- `dropzone_file_actions/` - File upload handling
  - `import_aqua_tree.tsx`, `import_aqua_tree_from_file.tsx`
  - `upload_file.tsx`, `form_revision.tsx`
- `aqua_tree_revision_details.tsx:46006` - Revision details (needs refactoring)
- `file_preview_aqua_tree_from_template.tsx` - File preview
- `ui/` - 39 reusable UI components (Radix + Tailwind)

**Key Pages:**
- `home.tsx` - Home page
- `files.tsx` - Files list page
- `templates_page.tsx` - Template management
- `settings_page.tsx` - User settings
- `share_page.tsx` - Sharing
- `notifications/` - Notifications
- `aqua_sign_wokflow/` - Signing workflow (6 files)
- `claims_workflow/` - Claims workflow (8 files)
- `v2_claims_workflow/` - V2 claims workflow (13 files)
- `legal/` - Terms, Privacy

**Key Utils:**
- `utils/functions.ts:110850` - Main utility functions (needs refactoring)
- `utils/aqua_funcs.ts` - Aqua Protocol functions
- `utils/dnsClaimVerification.ts` - DNS verification logic
- `utils/Logger.ts` - Frontend logging
- `utils/verifiy_dns.tsx` - DNS verification UI

**Key Dependencies:**
- react 19.0.0, react-dom 19.0.0 - Framework
- vite 7.0.0 - Build tool
- react-router-dom 7.0.2 - Routing
- zustand 5.0.5 - State management
- idb 8.0.2 - IndexedDB persistence
- ethers 6.13.4 - Blockchain
- aqua-js-sdk 3.2.1-44 - Aqua Protocol
- siwe 3.0.0 - SIWE authentication
- @solana/web3.js 1.98.2 - Solana support
- Radix UI - Accessible components (complete suite)
- @tailwindcss/vite 4.1.11 - Styling
- lucide-react 0.544.0 - Icons
- react-hook-form 7.55.0 - Forms
- jszip 3.10.1 - ZIP handling
- pdf-lib 1.17.1 - PDF manipulation
- @react-pdf/renderer 4.3.0 - PDF rendering
- docx-preview 0.3.5, mammoth 1.9.0 - DOCX preview
- heic2any 0.0.4 - HEIC conversion
- @sentry/react 10.5.0 - Error tracking
- @elastic/apm-rum 5.17.0 - APM
- sonner 2.0.6 - Toast notifications
- next-themes 0.4.6 - Theme management

### Chain Flow (chain-flow/)

**Purpose:** Standalone visualization component for Aqua chain/tree structures

**Tech Stack:**
- @xyflow/react 12.7.1 - Graph visualization
- dagre 0.8.5 - Automatic graph layout
- @chakra-ui/react 3.15.1 - UI components
- React 19.0.0

**Key Component:**
- `src/components/flow/HierarchicalChain.tsx` - Main visualization

### E2E Tests (e2e/)

**Framework:** Playwright 1.53.1

**Configuration (playwright.config.ts):**
- Headless: false (shows browser)
- Workers: 1 (configurable)
- Retries: 1
- Reporter: JUnit XML
- Timeouts: Action 240s, Navigation 60s
- MetaMask extension integration

**Test Utilities (testUtils.ts):**
- `registerNewMetaMaskWallet()` - Create wallet
- `registerNewMetaMaskWalletAndLogin()` - Create & login
- `uploadFile()`, `createTemplate()`, `createAquaSignForm()`
- `createSimpleClaim()`, `shareDocument()`, `signDocument()`
- `witnessDocument()`, `downloadAquaTree()`, `importAquaChain()`
- `fundWallet()`, `handleMetaMaskNetworkAndConfirm()`

**Test Cases (cases/tests.spec.ts):**
- Many tests currently skipped
- Active: Basic site accessibility, create wallet, login

## Environment Variables

**Location:** `deployment/.env.sample`

**Core Configuration:**
- `HOST`, `PORT` - Server configuration
- `FRONTEND_URL`, `BACKEND_URL` - URL configuration
- `ALLOWED_CORS` - CORS origins (comma-separated)

**Database:**
- `DATABASE_URL` - PostgreSQL connection string
- `DB_USER`, `DB_PASSWORD`, `DB_NAME` - Database credentials

**S3 Storage (MinIO):**
- `S3_USER`, `S3_PASSWORD`, `S3_BUCKET`, `S3_PORT`, `S3_URL`, `S3_USE_SSL`

**Blockchain:**
- `SERVER_MNEMONIC` - Server wallet mnemonic
- `VITE_INFURA_PROJECT_ID` - Infura project ID (optional)

**Twilio (SMS Verification):**
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`

**Backup:**
- `BACKUP_CRON` - Backup schedule (default: "0 0 * * *")
- `BACKUP_COUNT` - Backups to retain (default: 10)

**SSL:**
- `LETSENCRYPT_EMAIL` - Email for Let's Encrypt certificates

**Monitoring:**
- `SENTRY_DSN` - Sentry DSN
- `TRACING_ENABLE`, `TRACING_SERVICE_NAME`, `TRACING_SECRET`, `TRACING_URL`, `TRACING_ENV`

**Customization (Optional):**
- `CUSTOM_LANDING_PAGE_URL`, `CUSTOM_LOGO_URL`, `CUSTOM_NAME`, `CUSTOM_DESCRIPTION`

**Admin:**
- `admin_wallet` - Admin wallet address

## Development

**API Development:**
```bash
cd api
npm run dev          # Watch mode with tsx
npm run build        # Build TypeScript
npm run start        # Production mode
npm run test         # Run tap tests
npm run migrate-dev  # Prisma migration
npm run migrate-reset # Reset database
```

**Web Development:**
```bash
cd web
npm run dev          # Vite dev server (hot reload)
npm run build        # TypeScript + Vite build
npm run lint         # ESLint with auto-fix
npm run format       # Prettier formatting
npm run preview      # Preview production build
```

**E2E Testing:**
```bash
cd e2e
npm test             # Run Playwright tests
npm run test:debug   # Debug mode
npm run test:report  # Show test report
```

## Deployment

**Using Docker Compose:**

1. Prepare environment:
   ```bash
   cd deployment
   cp .env.sample .env
   # Edit .env with your configuration
   ```

2. Pull latest images (if using dev/prod):
   ```bash
   docker compose -f deployment/docker-compose-dev.yml pull
   ```

3. Start services:
   ```bash
   # Local (no proxy, exposed ports: 3000, 3600, 5438, 9000)
   docker compose -f deployment/docker-compose-local.yml up

   # Development (with proxy, Let's Encrypt, uses ghcr.io/inblockio/aquafier-js:dev)
   docker compose -f deployment/docker-compose-dev.yml up

   # Production (stable builds, uses ghcr.io/inblockio/aquafier-js:main)
   docker compose -f deployment/docker-compose-prod.yml up
   ```

Add `-d` flag to run in detached mode.

**Services:**
- `postgres` - PostgreSQL 17 with health checks
- `aqua-container` - Main application (API + Web)
- `s3storage` - MinIO S3-compatible storage
- `proxy` (dev/prod) - nginx reverse proxy
- `letsencrypt` (dev/prod) - ACME companion for SSL

**Dockerfile:** `actionfiles/aquafier-ts/dockerfile/Dockerfile`
- Multi-stage build: web builder, API builder, final runtime
- Node 22-slim base
- System deps: netcat, wget, cron, tar, gnupg, jq, postgresql-client
- Automated backups via cron

## Key Features

1. **Digital Content Signing** - Sign documents with blockchain-based signatures
2. **Provenance Verification** - Track document history and authenticity
3. **Integrity Validation** - Verify document integrity through Aqua chains
4. **Template System** - Create and manage document templates with custom fields
5. **Version Control** - Git-like revision system for documents
6. **DNS Claim Verification** - Verify ownership through DNS records
7. **SIWE Authentication** - Sign-in with Ethereum wallet (MetaMask, WalletConnect)
8. **Real-time Updates** - WebSocket support for live notifications
9. **File Sharing** - Share documents with access control and contracts
10. **Backup & Restore** - Automated backup system with configurable cron jobs
11. **Multi-chain Support** - Ethereum and Solana
12. **Document Preview** - PDF, DOCX, HEIC, and more
13. **Signature Management** - Digital signature system with verification
14. **Witness System** - Blockchain-based witnessing with Merkle trees
15. **Form Builder** - Dynamic form creation from templates

## Architecture Patterns

**Backend:**
- Controller-based routing with Fastify
- Prisma ORM for type-safe database access
- Middleware for authentication (src/middleware/auth_middleware.ts)
- Structured logging with Winston (ECS format)
- Error tracking with Sentry + profiling
- Request lifecycle hooks for logging
- Session management with nonce validation
- File upload size limits: 50MB body, 200MB multipart

**Frontend:**
- Component-based architecture with React 19
- State management with Zustand + IndexedDB persistence
- Type-safe with TypeScript
- Accessibility-first with Radix UI
- Utility-first CSS with Tailwind 4
- Theme management (dark/light) with next-themes
- Form handling with react-hook-form
- Error boundaries for fault isolation
- Wallet integration with ethers.js + SIWE

**Security:**
- SIWE for wallet-based authentication
- Session management with nonce validation
- CORS configuration for API security
- Rate limiting support (VerificationAttempt model)
- File upload size limits
- DNS verification for domain ownership
- Attestation addresses with trust levels
- Sentry error tracking in production

## Build & CI/CD

**GitHub Actions:** `.github/workflows/build-docker.yml`

**Triggers:**
- Manual: `workflow_dispatch`
- Push to: `main`, `dev`, `tracing`

**Workflow:**
1. Generate version info (commit SHA, build date) → `web/src/version-info.json`
2. Build Docker image (multi-stage)
3. Push to GitHub Container Registry: `ghcr.io/inblockio/aquafier-js`
4. Tag with commit SHA
5. Deploy to dev/main environments

**Image Tags:**
- `dev` - Latest development build
- `main` - Latest production build
- `<commit-sha>` - Specific commit builds

## Important Considerations

**When making changes:**
- Backend changes require TypeScript compilation: `npm run build`
- Database changes need Prisma migrations: `npm run migrate-dev`
- Frontend changes are hot-reloaded in dev mode
- E2E tests should be run before deployment
- Check logs: `docker logs {container_id}`

**File size limits:**
- Server body limit: 50MB
- Multipart upload limit: 200MB
- Request timeout: 2 minutes

**Testing:**
- Unit tests: tap framework (api/test/)
- E2E tests: Playwright with MetaMask (e2e/cases/)
- Current branch: `test-suite`
- Main branch: `main`

**Code Quality Notes:**
- Some files are large and being refactored:
  - `web/src/utils/functions.ts` (2,805 lines, 85 exports) - **IN PROGRESS**: Being split into focused modules (date-time, string, crypto, cookie, array, url, conversion, ui, network utils). See `web/src/utils/REFACTORING_GUIDE.md` for details.
  - `web/src/components/aqua_forms/CreateFormFromTemplate.tsx` - Needs refactoring
  - `web/src/components/aqua_tree_revision_details.tsx` - Needs refactoring
  - `web/src/store.ts` (9,912 lines) - Consider splitting into domain-specific stores

**Maintenance:**
- Renovate bot auto-updates dependencies (base: `dev`, schedule: daily 1 AM Europe/Berlin)
- Configuration: `/renovate.json`

## Authors & Maintenance

- **Project Manager:** Tim Bansemer (@FantasticoFox)
- **Developers:** Arthur Kamau (@Arthur-Kamau), Dalmas Nyaboga Ogembo (@dalmasonto)
- **DevOps:** Florian Zeps (@Zusel)
- **Automated Updates:** Renovate bot

## Links

- **Website:** https://aqua-protocol.org/
- **Repository:** https://github.com/inblockio/aquafier-js
- **Container Registry:** https://github.com/inblockio/aquafier-js/pkgs/container/aquafier-js
- **Live Dashboards:**
  - Production: https://aquafier.inblock.io
  - Development: https://dev.inblock.io
- **License:** MIT (see LICENSE file)

## API Endpoints Reference

### Authentication
- `GET /session` - Get current SIWE session
- `POST /auth/login` - SIWE login
- `POST /auth/logout` - Logout

### User Management
- `PUT /user_ens/:address` - Update ENS name
- `GET /user_ens/:address` - Get ENS name
- `GET /attestation_address` - List attestation addresses
- `POST /attestation_address` - Add attestation address
- `PUT /attestation_address` - Update attestation address
- `DELETE /attestation_address` - Remove attestation address
- `GET /explorer_fetch_user_settings` - Get user settings
- `POST /explorer_update_user_settings` - Update settings
- `DELETE /user_data` - Delete user data

### Files
- `GET /files/:fileHash` - Get file by hash
- `POST /file/object` - Create file object
- `POST /file/upload` - Upload file (multipart, max 200MB)

### Templates
- `GET /templates` - List templates
- `POST /templates` - Create template
- `DELETE /templates/:templateId` - Delete template
- `PUT /templates/:templateId` - Update template

### Sharing
- `GET /share_data/:hash` - Get share data
- `POST /share_data` - Create share
- `PUT /contracts/:hash` - Update contract
- `GET /contracts/:genesis_hash` - Get contract by genesis
- `DELETE /contracts/:hash` - Delete contract
- `GET /contracts` - List contracts

### Verification
- `POST /verify` - Verify general content
- `POST /verify/file` - Verify file
- `POST /verify/tree` - Verify tree structure
- `POST /verify/dns_claim` - Verify DNS claim

### Notifications
- `GET /notifications` - List notifications
- `POST /notifications/read` - Mark as read
- `DELETE /notifications/:id` - Delete notification

### System
- `GET /version` - Get version info
- `GET /system/health` - Health check

## Development Workflow

1. **Create feature branch** from `dev`:
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feature/your-feature
   ```

2. **Make changes** and test locally:
   ```bash
   cd api && npm run dev  # Terminal 1
   cd web && npm run dev  # Terminal 2
   ```

3. **Run tests**:
   ```bash
   cd api && npm run test
   cd e2e && npm test
   ```

4. **Commit changes**:
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

5. **Push and create PR** to `dev`:
   ```bash
   git push origin feature/your-feature
   # Create PR on GitHub targeting dev branch
   ```

6. **CI/CD** will build and deploy to dev environment automatically

7. **Production deployment:** Merge `dev` → `main` triggers production build

## Troubleshooting

**Database issues:**
```bash
cd api
npm run migrate-reset  # Reset database
npm run migrate-dev    # Run migrations
```

**Docker issues:**
```bash
docker compose down -v  # Remove volumes
docker compose up --build  # Rebuild images
```

**Frontend build issues:**
```bash
cd web
rm -rf node_modules dist
npm install
npm run build
```

**Check logs:**
```bash
docker logs aqua-container -f  # Follow logs
docker logs postgres -f        # Database logs
```

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- MetaMask extension required for wallet features
