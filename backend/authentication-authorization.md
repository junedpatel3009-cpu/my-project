# Authentication & Authorization

This document covers item **16.2 Backend - API, Database & Infrastructure: Authentication & Authorization**.

## Current Implementation

Authentication is handled inside the TanStack Start backend with signed HTTP cookies. The app supports:

- Email/password login
- Signup with email OTP
- Google OAuth login/signup
- Role-based access for clients and professionals
- Server-side guards for protected data and actions

## Main Files

| Area | File |
| --- | --- |
| Session cookie signing | `src/lib/auth-session.server.ts` |
| Current user lookup | `src/lib/current-user.server.ts` |
| User database access | `src/lib/user-db.server.ts` |
| Login page/action | `src/routes/login.tsx` |
| Signup page/action | `src/routes/signup.tsx` |
| Logout action | `src/lib/logout.server.ts` |
| Google OAuth start | `src/routes/api/auth/-google.ts` |
| Google OAuth callback | `src/routes/api/auth/google/-callback.ts` |
| Google OAuth helpers | `src/lib/google-oauth.server.ts` |
| OTP email helpers | `src/lib/otp.server.ts` |
| Login validation | `src/lib/validation/login.ts` |
| Signup validation | `src/lib/validation/signup.ts` |

## User Roles

The backend currently uses two roles:

```ts
type UserRole = "CLIENT" | "PROFESSIONAL";
```

Role is stored on the `User` record and included in the signed session payload.

Expected access split:

| Role | Access |
| --- | --- |
| `CLIENT` | Client dashboard, profile, job posting, hiring, client projects, client messages |
| `PROFESSIONAL` | Professional profile, verification, job discovery, proposals, work management, earnings |

## Session Model

The session cookie name is:

```txt
servio_session
```

The cookie stores a signed payload with:

- `userId`
- `role`
- `email`
- `issuedAt`

The session signature uses:

```txt
AUTH_SECRET
```

If `AUTH_SECRET` is missing, session creation/verification fails intentionally. This prevents unsigned production sessions.

## Cookie Security

The session cookie is created server-side with:

- `HttpOnly`
- `SameSite=Lax`
- `Path=/`
- `Secure` in production
- expiry/max-age

This means frontend JavaScript cannot directly read the session cookie. Server functions and API routes read it from the request headers.

## Email/Password Login Flow

```txt
User submits login form
  -> src/routes/login.tsx server function
  -> validate input with loginSchema
  -> find user by email
  -> hash submitted password
  -> compare with stored passwordHash
  -> set servio_session cookie
  -> return safe public user data
```

Current password hashing uses Web Crypto SHA-256 in the route action. This works, but a production-hardening step should replace it with a slow password hash such as bcrypt, argon2, or scrypt.

## Signup Flow

```txt
User requests OTP
  -> sendSignupOtp server function
  -> OTP email sent through SMTP

User submits signup form
  -> submitSignup server function
  -> validate input with signupSchema
  -> verify signup OTP
  -> check email/phone uniqueness
  -> create User record
  -> set servio_session cookie
```

Signup creates a user with one of the supported roles:

- `CLIENT`
- `PROFESSIONAL`

## Google OAuth Flow

```txt
User clicks Google button
  -> /api/auth/google
  -> generate random state
  -> store signed servio_google_state cookie
  -> redirect to Google OAuth

Google redirects back
  -> /api/auth/google/callback
  -> validate state cookie
  -> exchange code for Google user info
  -> create or update local user
  -> set servio_session cookie
  -> redirect into app
```

Google OAuth requires:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `APP_URL`
- `AUTH_SECRET`

## Authorization Guards

Main guard helpers:

```ts
getCurrentUser()
requireCurrentUser()
requireCurrentUserRole(role)
```

Expected use:

```ts
const user = requireCurrentUser();
```

For role-specific backend actions:

```ts
const client = requireCurrentUserRole("CLIENT");
const professional = requireCurrentUserRole("PROFESSIONAL");
```

Server actions should always verify the current user on the server. UI hiding is not enough for authorization.

## Route Protection Pattern

Protected pages generally use loaders or server functions to check access before loading private data.

Common checks:

- user is authenticated
- user has correct role
- requested record belongs to the current user
- user is a project participant
- user is the owner of the profile/job/project being modified

Example protected areas:

| Area | Protection |
| --- | --- |
| Client job editing | current user must own the job |
| Project tracking | current user must be the client or professional on the project |
| Professional stats | current user must be a professional |
| Client dashboard | current user must be a client |
| Notifications | current user can only read/update their own notifications |

## API Security Rules

Every backend action should follow these rules:

1. Validate input with a schema before using it.
2. Read the current user from the signed cookie.
3. Check role when the action is role-specific.
4. Check ownership when reading or mutating records.
5. Return safe public data only.
6. Avoid exposing secrets, password hashes, OTPs, or raw provider tokens.

## Environment Variables

Required for auth:

```txt
AUTH_SECRET="replace-with-a-long-random-secret"
APP_URL="http://localhost:5173"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

Required for OTP email:

```txt
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="Servio <your-email@gmail.com>"
```

## Test Checklist

Manual checks:

1. Signup sends OTP.
2. Signup rejects wrong OTP.
3. Signup creates session after correct OTP.
4. Login rejects wrong password.
5. Login creates session for correct password.
6. Google OAuth rejects invalid state.
7. Google OAuth creates session after valid callback.
8. Logout clears session.
9. Client-only pages reject professional users.
10. Professional-only pages reject client users.
11. Users cannot access another user's jobs, projects, notifications, or private profile actions.

## Production Hardening

Recommended next improvements:

1. Replace SHA-256 password hashing with bcrypt, argon2, or scrypt.
2. Add automated integration tests for login, signup, logout, role guards, and ownership checks.
3. Add rate limiting for login, signup OTP, password reset OTP, and OAuth callback failures.
4. Store OTPs with expiry and retry limits if not already enforced everywhere.
5. Add audit logging for sensitive actions such as login, password reset, verification approval, payouts, and admin actions.
6. Add admin role support if admin APIs become part of the backend scope.
7. Review all server functions to confirm every mutation checks current user ownership.
