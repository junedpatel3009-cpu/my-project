# 16.4 REST APIs - Client Module

This document covers **16.4 Backend - API, Database & Infrastructure: REST APIs - Client Module**.

## Status

Completed in the standalone backend API.

The Client module is implemented as REST APIs under:

```txt
/api/clients
```

Authentication is JWT Bearer token based.

## Client Module Purpose

The Client REST API handles:

- Client user registration
- Client login
- Current authenticated user lookup
- Client profile creation
- Client profile listing
- Client profile detail
- Client profile update
- Client profile delete
- Ownership-based authorization
- Input validation
- JSON error handling

## Main Files

| File | Purpose |
| --- | --- |
| `backend/src/modules/client.mjs` | Client module architecture metadata |
| `backend/src/controllers.mjs` | Client API request handlers |
| `backend/src/repositories.mjs` | Client database queries |
| `backend/src/validators.mjs` | Client request validation schemas |
| `backend/src/db.mjs` | SQLite `clients` table setup |
| `backend/src/server.mjs` | REST route registration |
| `backend/src/openapi.mjs` | Swagger/OpenAPI documentation |

## Database Tables

The Client module uses:

```txt
users
clients
```

`users` stores authentication data:

- `id`
- `role`
- `name`
- `email`
- `password_hash`
- `created_at`
- `updated_at`

`clients` stores client profile data:

- `id`
- `user_id`
- `company_name`
- `contact_name`
- `phone`
- `address`
- `industry`
- `notes`
- `created_at`
- `updated_at`

## API Endpoints

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | No | Register a user with `role: "CLIENT"` |
| `POST` | `/api/auth/login` | No | Login and receive JWT |
| `GET` | `/api/auth/me` | Bearer token | Get current user |
| `GET` | `/api/clients` | Bearer token | List client profiles |
| `POST` | `/api/clients` | `CLIENT` or `ADMIN` | Create client profile |
| `GET` | `/api/clients/:id` | Owner or `ADMIN` | Get one client profile |
| `PUT` | `/api/clients/:id` | Owner or `ADMIN` | Update client profile |
| `DELETE` | `/api/clients/:id` | Owner or `ADMIN` | Delete client profile |
| `GET` | `/api/modules/client` | No | Show Client module API map |

## Validation Rules

Client profile create requires:

```json
{
  "companyName": "Acme Inc",
  "contactName": "Jane Client"
}
```

Optional fields:

```json
{
  "phone": "+15550001111",
  "address": "New York",
  "industry": "Technology",
  "notes": "Needs trusted service providers"
}
```

Validation is handled in:

```txt
backend/src/validators.mjs
```

## Authorization Rules

- A `CLIENT` user can create one client profile for themselves.
- A `CLIENT` user can only view, update, or delete their own client profile.
- An `ADMIN` user can manage any client profile.
- A `PROFESSIONAL` user can list clients but cannot create/update/delete client profiles.

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
| `404` | Client profile not found |
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

Client module map:

```txt
http://localhost:5000/api/modules/client
```

Database status:

```txt
http://localhost:5000/api/db/full
```

## Demo Flow

1. Register client
2. Login client
3. Copy JWT token
4. Create client profile
5. List clients
6. Get client by ID
7. Update client by ID
8. Delete client by ID

## Example Requests

Register client:

```bash
curl -X POST http://localhost:5000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"role\":\"CLIENT\",\"name\":\"Jane Client\",\"email\":\"client@example.com\",\"password\":\"password123\"}"
```

Login:

```bash
curl -X POST http://localhost:5000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"client@example.com\",\"password\":\"password123\"}"
```

Create profile:

```bash
curl -X POST http://localhost:5000/api/clients ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer YOUR_TOKEN" ^
  -d "{\"companyName\":\"Acme Inc\",\"contactName\":\"Jane Client\",\"phone\":\"+15550001111\",\"address\":\"New York\",\"industry\":\"Technology\"}"
```

List clients:

```bash
curl http://localhost:5000/api/clients ^
  -H "Authorization: Bearer YOUR_TOKEN"
```

Update client:

```bash
curl -X PUT http://localhost:5000/api/clients/1 ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer YOUR_TOKEN" ^
  -d "{\"notes\":\"Updated client notes\"}"
```

Delete client:

```bash
curl -X DELETE http://localhost:5000/api/clients/1 ^
  -H "Authorization: Bearer YOUR_TOKEN"
```
