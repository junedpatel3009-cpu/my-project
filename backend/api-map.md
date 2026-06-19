# Backend API Map

## HTTP API Routes

| Route | File | Purpose |
| --- | --- | --- |
| `/api/health` | `src/server.ts` | Backend health check |
| `/api/auth/google` | `src/routes/api/auth/-google.ts` | Start Google OAuth |
| `/api/auth/google/callback` | `src/routes/api/auth/google/-callback.ts` | Complete Google OAuth |

## Server Function Areas

| Area | Main Files |
| --- | --- |
| Authentication | `src/routes/login.tsx`, `src/routes/signup.tsx`, `src/lib/auth-session.server.ts` |
| Current user | `src/lib/current-user.server.ts`, `src/lib/user-db.server.ts` |
| Client profile | `src/client/profile-setup.tsx`, `src/lib/user-db.server.ts` |
| Client jobs | `src/client/post-job.tsx`, `src/client/projects.tsx`, `src/lib/job-db.server.ts` |
| Hiring | `src/client/hire.$proId.tsx`, `src/lib/hire-db.server.ts` |
| Project tracking | `src/client/project-track.$trackingId.tsx`, `src/professional/stats.tsx`, `src/lib/project-request-db.server.ts` |
| Notifications | `src/components/AppShell.tsx`, `src/lib/notification-db.server.ts`, `server/socket-server.mjs` |
| Professional profile | `src/professional/profile-setup.tsx`, `src/lib/user-db.server.ts` |
| Verification | `src/professional/verification.tsx`, `src/lib/pro-verification-db.server.ts` |

## Realtime Events

The socket server is in `server/socket-server.mjs`.

Main event groups:

- `notifications:*`
- `conversation:*`
- `message:*`
- `typing:*`
- `project:*`
- `call:*`
