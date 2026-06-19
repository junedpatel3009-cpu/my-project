# Project Architecture

This backend is part of a TanStack Start full-stack app. The project uses one app server for pages, server functions, and API routes, plus one separate Socket.IO server for realtime communication.

## High-Level Architecture

```txt
Browser / Client UI
  |
  | page loads, forms, server function calls
  v
TanStack Start App Server
  |
  | API routes and server functions
  v
Server Modules in src/lib
  |
  | database reads and writes
  v
SQLite Database in prisma/app.db

Browser / Client UI
  |
  | realtime events
  v
Socket.IO Server
  |
  | message and notification persistence
  v
SQLite Database in prisma/app.db
```

## Two Backend Parts

The standalone backend is organized into separate business modules. Client and Professional are the two core account modules; Maps/Location and File Storage/CDN are supporting infrastructure modules.

### Part 1: Client Backend Module

Purpose:

- Client user registration and login
- Client profile creation
- Client company/contact details
- Client profile CRUD
- Client authorization using JWT and `CLIENT` role

Main API routes:

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Register client user with `role: "CLIENT"` |
| `POST` | `/api/auth/login` | Login and receive JWT |
| `GET` | `/api/auth/me` | Get current authenticated user |
| `GET` | `/api/clients` | List client profiles |
| `POST` | `/api/clients` | Create client profile |
| `GET` | `/api/clients/:id` | Get one client profile |
| `PUT` | `/api/clients/:id` | Update one client profile |
| `DELETE` | `/api/clients/:id` | Delete one client profile |

Database tables:

- `users`
- `clients`

Module metadata file:

```txt
backend/src/modules/client.mjs
```

### Part 2: Professional Backend Module

Purpose:

- Professional user registration and login
- Professional profile creation
- Category, city, skills, hourly rate, experience, bio
- Professional profile CRUD
- Professional authorization using JWT and `PROFESSIONAL` role

Main API routes:

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Register professional user with `role: "PROFESSIONAL"` |
| `POST` | `/api/auth/login` | Login and receive JWT |
| `GET` | `/api/auth/me` | Get current authenticated user |
| `GET` | `/api/professionals` | List professional profiles |
| `POST` | `/api/professionals` | Create professional profile |
| `GET` | `/api/professionals/:id` | Get one professional profile |
| `PUT` | `/api/professionals/:id` | Update one professional profile |
| `DELETE` | `/api/professionals/:id` | Delete one professional profile |

Database tables:

- `users`
- `professionals`

Module metadata file:

```txt
backend/src/modules/professional.mjs
```

### Part 3: Maps & Location Infrastructure Module

Purpose:

- Saved client/professional locations
- Public/private visibility
- Primary location support
- Distance and nearby-location APIs

Module metadata file:

```txt
backend/src/modules/maps-location.mjs
```

### Part 4: File Storage & CDN Infrastructure Module

Purpose:

- File metadata storage
- Local S3/cloud storage simulation
- CDN-style URLs
- Signed-style access URLs
- Public/private file access

Module metadata file:

```txt
backend/src/modules/file-storage.mjs
```

## Runtime Parts

| Part | Location | Purpose |
| --- | --- | --- |
| App server entry | `src/server.ts` | Wraps TanStack Start SSR/API handling and returns branded error pages for catastrophic SSR errors |
| App startup | `src/start.ts` | Configures TanStack Start middleware, including error capture and CSRF protection |
| Router | `src/router.tsx`, `src/routeTree.gen.ts` | Registers pages and app routes |
| API routes | `src/routes/api` | Handles explicit HTTP API endpoints |
| Server functions | `src/client`, `src/professional`, `src/routes`, `src/components` | Handles page-specific backend actions and data loading |
| Backend modules | `src/lib/*.server.ts` | Holds auth, database, notifications, jobs, projects, and profile logic |
| Realtime server | `server/socket-server.mjs` | Handles messages, calls, project activity, and notification refresh events |
| Database schema | `prisma/schema.prisma` | Prisma schema for core relational models |
| Database migrations | `prisma/migrations` | SQL migrations for tracked Prisma-backed tables |

## Request Flow

1. A user opens a page or submits an action from the browser.
2. TanStack Start routes the request through `src/server.ts`.
3. Page loaders and actions call `createServerFn` handlers.
4. Server functions call backend modules in `src/lib`.
5. Backend modules validate access, read/write SQLite, and return safe data to the UI.

For explicit API endpoints, the flow is:

```txt
Browser
  -> /api/*
  -> createAPIFileRoute handler
  -> src/lib backend module
  -> SQLite / external service
  -> JSON or redirect response
```

## Architecture API

Run the backend and open:

```txt
http://localhost:5000/api/architecture
```

This returns the Client, Professional, Maps/Location, and File Storage/CDN backend module map as JSON.

## API Route Convention

TanStack API files use `createAPIFileRoute`.

Current API routes:

- `/api/health` from `src/routes/api/-health.ts`
- `/api/auth/google` from `src/routes/api/auth/-google.ts`
- `/api/auth/google/callback` from `src/routes/api/auth/google/-callback.ts`

Files prefixed with `-` are ignored by the normal route tree but still work as API routes.

## Authentication Architecture

Authentication is cookie-session based.

Main files:

- `src/lib/auth-session.server.ts`
- `src/lib/current-user.server.ts`
- `src/lib/user-db.server.ts`
- `src/routes/login.tsx`
- `src/routes/signup.tsx`
- `src/routes/api/auth/-google.ts`
- `src/routes/api/auth/google/-callback.ts`

Flow:

1. User logs in with email/password, signup OTP, or Google OAuth.
2. Server creates a signed `servio_session` cookie.
3. Backend reads the cookie with `readSessionFromCookieHeader`.
4. Protected actions use `getCurrentUser`, `requireCurrentUser`, or role checks.
5. Logout clears the session cookie.

Required secret:

- `AUTH_SECRET`

## Database Architecture

The local database is SQLite:

```txt
prisma/app.db
```

The project currently uses two database styles:

| Style | Used By | Notes |
| --- | --- | --- |
| Prisma schema and migrations | Core models such as users, jobs, favorites, project transactions, reviews | Tracked in `prisma/schema.prisma` and `prisma/migrations` |
| Direct `better-sqlite3` setup | Larger feature modules such as projects, hire flow, notifications, sockets | Tables are created with `CREATE TABLE IF NOT EXISTS` in server modules |

Main database modules:

- `src/lib/user-db.server.ts`
- `src/lib/job-db.server.ts`
- `src/lib/project-request-db.server.ts`
- `src/lib/hire-db.server.ts`
- `src/lib/notification-db.server.ts`
- `src/lib/pro-verification-db.server.ts`
- `src/lib/phase1-profile-db.server.ts`

Production setup should gradually move runtime-created tables into formal migrations so database setup is predictable.

## Realtime Architecture

Realtime features run through Socket.IO:

```txt
server/socket-server.mjs
```

Default URL:

```txt
http://localhost:4001
```

Main event groups:

- `notifications:*`
- `conversation:*`
- `message:*`
- `typing:*`
- `project:*`
- `call:*`

The frontend reads the socket URL from:

- `VITE_SOCKET_URL`

The socket server reads:

- `SOCKET_PORT`
- `SOCKET_CLIENT_ORIGIN`

## External Services

| Service | Purpose | Env Vars |
| --- | --- | --- |
| SMTP | Signup OTP, password reset OTP, notification emails | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` |
| Google OAuth | Login/signup with Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APP_URL` |
| Google Maps | Location picker, distance, map UI | `VITE_GOOGLE_MAPS_API_KEY`, `VITE_GOOGLE_MAPS_JS_ENABLED` |
| Socket.IO | Realtime messages and notifications | `VITE_SOCKET_URL`, `SOCKET_PORT`, `SOCKET_CLIENT_ORIGIN` |

## Infrastructure Setup

Development:

```bash
npm run backend:dev
npm run backend:socket
```

Database setup:

```bash
npm run prisma:generate
npm run prisma:push
```

Production build:

```bash
npm run build
```

Current deployment config:

- `vite.config.ts` uses `@lovable.dev/vite-tanstack-config`
- `wrangler.jsonc` points Cloudflare Worker build at `src/server.ts`
- `DEPLOY.md` documents a separate Vercel deployment branch flow

## Backend Folder Purpose

This `backend/` folder is the backend working area. It does not duplicate the running app code. Instead, it gives backend-only entry points and documentation while the real app remains compatible with TanStack Start.

Use this folder for:

- architecture notes
- API map
- backend setup instructions
- future backend-specific checklists
- future database migration planning

## Next Architecture Tasks

Recommended next work after this setup:

1. Add a database table inventory document.
2. Move more runtime-created tables into Prisma migrations.
3. Add route-level API documentation for client, professional, admin, payments, and notifications.
4. Add simple integration checks for auth, health, database, and socket startup.
5. Decide final deployment target: Cloudflare Worker, Vercel, or a Node server setup.
