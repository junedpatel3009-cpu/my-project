# 16.6 REST APIs - Maps & Location

This document covers **16.6 Backend - API, Database & Infrastructure: REST APIs - Maps & Location**.

## Status

Completed in the standalone backend API.

The Maps & Location module is implemented as REST APIs under:

```txt
/api/locations
```

Authentication is JWT Bearer token based for saved locations and nearby search.

## Module Purpose

The Maps & Location REST API handles:

- Saved client/professional locations
- Address and latitude/longitude storage
- Primary location flag
- Public/private location visibility
- Location CRUD
- Distance calculation between two coordinates
- Nearby public location search
- Owner/admin authorization
- Input validation
- JSON error handling

## Main Files

| File | Purpose |
| --- | --- |
| `backend/src/modules/maps-location.mjs` | Maps & Location module architecture metadata |
| `backend/src/controllers.mjs` | Location API request handlers |
| `backend/src/repositories.mjs` | Location database queries and distance calculation |
| `backend/src/validators.mjs` | Location request validation schemas |
| `backend/src/db.mjs` | SQLite `locations` table setup |
| `backend/src/server.mjs` | REST route registration |
| `backend/src/openapi.mjs` | Swagger/OpenAPI documentation |

## Database Table

The module uses:

```txt
locations
```

Fields:

- `id`
- `user_id`
- `owner_type`
- `label`
- `address`
- `latitude`
- `longitude`
- `radius_km`
- `is_primary`
- `visibility`
- `created_at`
- `updated_at`

## API Endpoints

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/locations` | Bearer token | List own locations, admin locations, or public locations |
| `POST` | `/api/locations` | Bearer token | Create saved location |
| `GET` | `/api/locations/:id` | Owner, public, or `ADMIN` | Get one location |
| `PUT` | `/api/locations/:id` | Owner or `ADMIN` | Update one location |
| `DELETE` | `/api/locations/:id` | Owner or `ADMIN` | Delete one location |
| `POST` | `/api/locations/distance` | No | Calculate distance between two coordinates |
| `GET` | `/api/locations/nearby` | Bearer token | Find public locations within radius |
| `GET` | `/api/modules/maps-location` | No | Show Maps & Location module API map |

## Example Location Body

```json
{
  "label": "Office",
  "address": "New York, NY",
  "latitude": 40.7128,
  "longitude": -74.006,
  "radiusKm": 25,
  "isPrimary": true,
  "visibility": "PUBLIC"
}
```

## Distance Body

```json
{
  "from": { "latitude": 40.7128, "longitude": -74.006 },
  "to": { "latitude": 42.3601, "longitude": -71.0589 }
}
```

Response:

```json
{
  "distanceKm": 306.11,
  "distanceMiles": 190.21
}
```

## How To Run

From `backend` folder:

```bash
npm run dev
```

Swagger docs:

```txt
http://localhost:5000/docs
```

Maps & Location module map:

```txt
http://localhost:5000/api/modules/maps-location
```

Database status:

```txt
http://localhost:5000/api/db/full
```

## Demo Flow

1. Register/login client or professional.
2. Copy JWT token.
3. Create saved location.
4. List locations.
5. Update location.
6. Calculate distance between two coordinates.
7. Search nearby public locations.
8. Delete location.

## Example Requests

Create saved location:

```bash
curl -X POST http://localhost:5000/api/locations ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer YOUR_TOKEN" ^
  -d "{\"label\":\"Office\",\"address\":\"New York, NY\",\"latitude\":40.7128,\"longitude\":-74.006,\"radiusKm\":25,\"isPrimary\":true,\"visibility\":\"PUBLIC\"}"
```

List own locations:

```bash
curl http://localhost:5000/api/locations ^
  -H "Authorization: Bearer YOUR_TOKEN"
```

Calculate distance:

```bash
curl -X POST http://localhost:5000/api/locations/distance ^
  -H "Content-Type: application/json" ^
  -d "{\"from\":{\"latitude\":40.7128,\"longitude\":-74.006},\"to\":{\"latitude\":42.3601,\"longitude\":-71.0589}}"
```

Find nearby public locations:

```bash
curl "http://localhost:5000/api/locations/nearby?latitude=40.7128&longitude=-74.006&radiusKm=50" ^
  -H "Authorization: Bearer YOUR_TOKEN"
```
