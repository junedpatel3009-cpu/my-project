# 16.5 REST APIs - Professional Module

This document covers **16.5 Backend - API, Database & Infrastructure: REST APIs - Professional Module**.

## Status

Completed in the standalone backend API.

The Professional module is implemented as REST APIs under:

```txt
/api/professionals
```

Authentication is JWT Bearer token based.

## Professional Module Purpose

The Professional REST API handles:

- Professional user registration
- Professional login
- Current authenticated user lookup
- Professional profile creation
- Professional profile listing
- Professional profile detail
- Professional profile update
- Professional profile delete
- Skills/category/city profile fields
- Verification status field
- Ownership-based authorization
- Input validation
- JSON error handling

## Main Files

| File | Purpose |
| --- | --- |
| `backend/src/modules/professional.mjs` | Professional module architecture metadata |
| `backend/src/controllers.mjs` | Professional API request handlers |
| `backend/src/repositories.mjs` | Professional database queries |
| `backend/src/validators.mjs` | Professional request validation schemas |
| `backend/src/db.mjs` | SQLite `professionals` table setup |
| `backend/src/server.mjs` | REST route registration |
| `backend/src/openapi.mjs` | Swagger/OpenAPI documentation |

## Database Tables

The Professional module uses:

```txt
users
professionals
```

`professionals` stores:

- `id`
- `user_id`
- `display_name`
- `category`
- `city`
- `skills_json`
- `hourly_rate`
- `experience_years`
- `bio`
- `verification_status`
- `created_at`
- `updated_at`

## API Endpoints

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | No | Register a user with `role: "PROFESSIONAL"` |
| `POST` | `/api/auth/login` | No | Login and receive JWT |
| `GET` | `/api/auth/me` | Bearer token | Get current user |
| `GET` | `/api/professionals` | Bearer token | List professional profiles |
| `POST` | `/api/professionals` | `PROFESSIONAL` or `ADMIN` | Create professional profile |
| `GET` | `/api/professionals/:id` | Owner or `ADMIN` | Get one professional profile |
| `PUT` | `/api/professionals/:id` | Owner or `ADMIN` | Update professional profile |
| `DELETE` | `/api/professionals/:id` | Owner or `ADMIN` | Delete professional profile |
| `GET` | `/api/modules/professional` | No | Show Professional module API map |

## Validation Rules

Professional profile create requires:

```json
{
  "displayName": "Pat Pro",
  "category": "Plumbing",
  "city": "Boston"
}
```

Optional fields:

```json
{
  "skills": ["Repairs", "Installations"],
  "hourlyRate": 75,
  "experienceYears": 8,
  "bio": "Licensed service professional",
  "verificationStatus": "PENDING"
}
```

Validation is handled in:

```txt
backend/src/validators.mjs
```

## Authorization Rules

- A `PROFESSIONAL` user can create one professional profile for themselves.
- A `PROFESSIONAL` user can only view, update, or delete their own professional profile.
- An `ADMIN` user can manage any professional profile.
- A `CLIENT` user can list professionals but cannot create/update/delete professional profiles.

## Error Handling

All errors return JSON:

```json
{
  "error": {
    "message": "Validation failed.",
    "details": []
  }
}
```

Common status codes:

| Status | Meaning |
| --- | --- |
| `200` | Success |
| `201` | Created |
| `400` | Validation error |
| `401` | Missing or invalid token |
| `403` | Forbidden role or ownership |
| `404` | Professional profile not found |
| `409` | Duplicate profile or email |
| `500` | Unexpected backend error |

## How To Run

From `backend` folder:

```bash
npm run dev
```

Swagger docs:

```txt
http://localhost:5000/docs
```

Professional module map:

```txt
http://localhost:5000/api/modules/professional
```

Database status:

```txt
http://localhost:5000/api/db/full
```

## Demo Flow

1. Register professional
2. Login professional
3. Copy JWT token
4. Create professional profile
5. List professionals
6. Get professional by ID
7. Update professional by ID
8. Delete professional by ID

## Example Requests

Register professional:

```bash
curl -X POST http://localhost:5000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"role\":\"PROFESSIONAL\",\"name\":\"Pat Pro\",\"email\":\"pro@example.com\",\"password\":\"password123\"}"
```

Login:

```bash
curl -X POST http://localhost:5000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"pro@example.com\",\"password\":\"password123\"}"
```

Create profile:

```bash
curl -X POST http://localhost:5000/api/professionals ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer YOUR_TOKEN" ^
  -d "{\"displayName\":\"Pat Pro\",\"category\":\"Plumbing\",\"city\":\"Boston\",\"skills\":[\"Repairs\",\"Installations\"],\"hourlyRate\":75,\"experienceYears\":8,\"bio\":\"Licensed service professional\"}"
```

List professionals:

```bash
curl http://localhost:5000/api/professionals ^
  -H "Authorization: Bearer YOUR_TOKEN"
```

Update professional:

```bash
curl -X PUT http://localhost:5000/api/professionals/1 ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer YOUR_TOKEN" ^
  -d "{\"city\":\"Cambridge\",\"hourlyRate\":80}"
```

Delete professional:

```bash
curl -X DELETE http://localhost:5000/api/professionals/1 ^
  -H "Authorization: Bearer YOUR_TOKEN"
```
