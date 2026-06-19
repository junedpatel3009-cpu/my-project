# Standalone Backend API

This folder contains a complete runnable backend REST API. It is separate from the frontend app and can be tested directly with HTTP requests.

## Features

- Node HTTP server
- SQLite database with automatic schema setup
- Users, clients, professionals, locations, and storage tables
- JWT authentication and authorization
- Role-based access for `ADMIN`, `CLIENT`, and `PROFESSIONAL`
- Client CRUD REST APIs
- Professional CRUD REST APIs
- Maps and location REST APIs
- File storage/CDN metadata REST APIs
- Request validation with `zod`
- Consistent JSON error handling
- Swagger/OpenAPI documentation
- Postman collection

## Run

From the project root:

```bash
npm run backend:api
```

From this `backend` folder:

```bash
npm run dev
```

The API runs at:

```txt
http://localhost:5000
```

Swagger docs:

```txt
http://localhost:5000/docs
```

OpenAPI JSON:

```txt
http://localhost:5000/openapi.json
```

Health check:

```txt
http://localhost:5000/health
```

Database status:

```txt
http://localhost:5000/api/db/status
```

Full database overview:

```txt
http://localhost:5000/api/db/full
```

Single table rows:

```txt
http://localhost:5000/api/db/tables/users
http://localhost:5000/api/db/tables/clients
http://localhost:5000/api/db/tables/professionals
http://localhost:5000/api/db/tables/storage_files
```

## Environment

Optional values in root `.env`:

```txt
BACKEND_PORT=5000
BACKEND_DATABASE_PATH="backend/data/backend.sqlite"
JWT_SECRET="replace-with-a-long-random-jwt-secret"
```

If `JWT_SECRET` is missing, the backend falls back to `AUTH_SECRET`.

## Default Admin

On first startup, the backend creates a demo admin:

```txt
email: admin@example.com
password: admin12345
```

Use this account to test admin-level CRUD access.

## Main Endpoints

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | No | Health check |
| `GET` | `/api/architecture` | No | Client/Professional architecture map |
| `GET` | `/api/modules/client` | No | Client module API map |
| `GET` | `/api/modules/professional` | No | Professional module API map |
| `GET` | `/api/modules/maps-location` | No | Maps & Location module API map |
| `GET` | `/api/modules/file-storage` | No | File Storage & CDN module API map |
| `GET` | `/api/db/status` | No | Database connection status |
| `GET` | `/api/db/full` | No | Full read-only database overview |
| `GET` | `/api/db/tables/:tableName` | No | Read rows from one table |
| `POST` | `/api/auth/register` | No | Register client or professional |
| `POST` | `/api/auth/login` | No | Login and get JWT |
| `GET` | `/api/auth/me` | Bearer token | Current user |
| `GET` | `/api/clients` | Bearer token | List clients |
| `POST` | `/api/clients` | Client/Admin | Create client profile |
| `GET` | `/api/clients/:id` | Owner/Admin | Get client profile |
| `PUT` | `/api/clients/:id` | Owner/Admin | Update client profile |
| `DELETE` | `/api/clients/:id` | Owner/Admin | Delete client profile |
| `GET` | `/api/professionals` | Bearer token | List professionals |
| `POST` | `/api/professionals` | Professional/Admin | Create professional profile |
| `GET` | `/api/professionals/:id` | Owner/Admin | Get professional profile |
| `PUT` | `/api/professionals/:id` | Owner/Admin | Update professional profile |
| `DELETE` | `/api/professionals/:id` | Owner/Admin | Delete professional profile |
| `GET` | `/api/locations` | Bearer token | List locations |
| `POST` | `/api/locations` | Bearer token | Create saved location |
| `GET` | `/api/locations/:id` | Owner/Public/Admin | Get location |
| `PUT` | `/api/locations/:id` | Owner/Admin | Update location |
| `DELETE` | `/api/locations/:id` | Owner/Admin | Delete location |
| `POST` | `/api/locations/distance` | No | Calculate coordinate distance |
| `GET` | `/api/locations/nearby` | Bearer token | Find public nearby locations |
| `GET` | `/api/storage/files` | Bearer token | List storage files |
| `POST` | `/api/storage/files` | Bearer token | Create file metadata and CDN URL |
| `GET` | `/api/storage/files/:id` | Owner/Public/Admin | Get storage file |
| `PUT` | `/api/storage/files/:id` | Owner/Admin | Update storage file |
| `DELETE` | `/api/storage/files/:id` | Owner/Admin | Delete storage file |
| `GET` | `/api/storage/files/:id/access-url` | Owner/Public/Admin | Generate signed-style access URL |
| `GET` | `/cdn/:objectKey` | No | Local CDN simulator |

## Example API Test

Register:

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

Use the returned token:

```bash
curl http://localhost:5000/api/auth/me ^
  -H "Authorization: Bearer YOUR_TOKEN"
```

Create client profile:

```bash
curl -X POST http://localhost:5000/api/clients ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer YOUR_TOKEN" ^
  -d "{\"companyName\":\"Acme Inc\",\"contactName\":\"Jane Client\",\"phone\":\"+15550001111\",\"address\":\"New York\",\"industry\":\"Technology\"}"
```

## Files

```txt
backend/
  src/
    config.mjs
    controllers.mjs
    db.mjs
    errors.mjs
    openapi.mjs
    repositories.mjs
    server.mjs
    utils.mjs
    validators.mjs
  postman-collection.json
  package.json
```
