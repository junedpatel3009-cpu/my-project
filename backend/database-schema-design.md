# Database Schema Design & Setup

This document covers item **16.3 Backend - API, Database & Infrastructure: Database Schema Design & Setup**.

## Current Database Stack

The standalone backend API uses SQLite for local development:

```txt
backend/data/backend.sqlite
```

The standalone backend database has automatic setup in:

```txt
backend/src/db.mjs
```

## Prisma Setup

Main files:

| File | Purpose |
| --- | --- |
| `prisma/schema.prisma` | Main Prisma schema |
| `prisma/migrations` | SQL migration history |
| `src/lib/prisma.ts` | Prisma client initialization |
| `src/generated/prisma` | Generated Prisma client output |
| `.env.example` | Documents `DATABASE_URL` |

Current datasource:

```prisma
datasource db {
  provider = "sqlite"
}
```

Current client output:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}
```

Required environment variable:

```txt
DATABASE_URL="file:./prisma/app.db"
```

## Prisma Models

Current schema groups:

| Model | Purpose |
| --- | --- |
| `User` | Client and professional accounts, auth provider data, profile fields, professional discovery fields |
| `ClientProfile` | Client company/profile setup |
| `ClientSavedLocation` | Client saved addresses |
| `ClientHiringNeed` | Client hiring/service needs |
| `ClientJob` | Client job/project posting |
| `ClientJobAttachment` | Files attached to client jobs |
| `FavoriteJob` | Professional saved/favorited jobs |
| `ProjectTransaction` | Project payment and transaction records |
| `ProjectNegotiation` | Bid/proposal negotiation history |
| `ProjectReview` | Client review of completed project/professional |

Current enums:

| Enum | Values |
| --- | --- |
| `UserRole` | `CLIENT`, `PROFESSIONAL` |
| `JobUrgency` | `LOW`, `MEDIUM`, `HIGH` |
| `JobWorkMode` | `ON_SITE`, `REMOTE`, `BOTH` |
| `JobStatus` | `DRAFT`, `OPEN`, `CLOSED` |

## Key Relationships

```txt
User
  -> ClientProfile[]
  -> ClientJob[]
  -> FavoriteJob[]

ClientProfile
  -> ClientSavedLocation[]
  -> ClientHiringNeed[]

ClientJob
  -> ClientJobAttachment[]
  -> FavoriteJob[]
```

Project tables use IDs for client, professional, tracking, milestone, and completion records. Some of these linked tables currently live in runtime-created SQLite tables rather than Prisma models.

## Indexed Fields

Important indexes already present:

| Table | Index |
| --- | --- |
| `ClientProfile` | `userId` |
| `ClientSavedLocation` | `clientProfileId` |
| `ClientHiringNeed` | `clientProfileId` |
| `ClientJob` | `userId`, `status` |
| `FavoriteJob` | `userId`, `jobId`, unique `userId + jobId` |
| `ClientJobAttachment` | `jobId` |
| `ProjectTransaction` | `trackingId`, `clientId`, `professionalId`, `status` |
| `ProjectNegotiation` | `requestId`, `clientId`, `professionalId` |
| `ProjectReview` | `trackingId`, `clientId`, `professionalId` |

## Runtime SQLite Tables

Several modules currently ensure tables with direct SQL. These are part of the working backend even if they are not yet fully represented in `schema.prisma`.

| Area | Files | Example Tables |
| --- | --- | --- |
| Jobs | `src/lib/job-db.server.ts` | `ClientJob`, `ClientJobAttachment`, `FavoriteJob` |
| Projects | `src/lib/project-request-db.server.ts` | `ProjectRequest`, `ProjectTracking`, milestones, uploads, revisions, disputes, withdrawals |
| Direct hire | `src/lib/hire-db.server.ts` | `contracts`, `milestones`, `DirectHireNegotiation` |
| Notifications | `src/lib/notification-db.server.ts`, `src/lib/notification-email.server.ts` | `UserNotification`, notification state tables |
| Realtime messages | `server/socket-server.mjs` | `SocketConversation`, `SocketMessage`, `SocketConversationClear` |
| Verification | `src/lib/pro-verification-db.server.ts` | Professional verification records |
| Profile setup | `src/lib/phase1-profile-db.server.ts` | Phase-1 professional profile and verification support tables |

## Setup Commands

Generate Prisma client:

```bash
npm run prisma:generate
```

Push schema to SQLite:

```bash
npm run prisma:push
```

Open Prisma Studio:

```bash
npm run prisma:studio
```

Build verification:

```bash
npm run build
```

Run backend/app server:

```bash
npm run backend:dev
```

Open backend health API:

```txt
http://localhost:8085/api/health
```

## Database Setup Checklist

Completed:

- SQLite database location documented.
- Prisma schema location documented.
- Prisma client generation command documented.
- Core models and enums inventoried.
- Key indexes and unique constraints documented.
- Runtime SQLite table strategy documented.
- Backend health endpoint added to confirm app/API server is running.
- Backend documents added under the `backend/` folder for visible backend progress.

Next:

- Move more runtime-created tables into Prisma migrations.
- Add missing Prisma models for project tracking, requests, milestones, uploads, disputes, withdrawals, socket conversations, socket messages, and notifications.
- Add seed script for local demo data.
- Add database integration tests for create/read/update flows.
- Decide whether production database remains SQLite or moves to PostgreSQL.

## Production Notes

For production, the safest database setup is:

1. Keep all schema changes in migrations.
2. Avoid creating or altering tables at request time.
3. Run migrations before deployment.
4. Use backups before applying migration changes.
5. Keep secrets in deployment environment variables, not committed files.
6. If the app needs concurrent production traffic, consider PostgreSQL instead of SQLite.
