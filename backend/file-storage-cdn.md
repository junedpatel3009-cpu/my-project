# File Storage (S3 / Cloud) & CDN

## Backend Scope

This section is implemented as a runnable local backend module. It simulates S3/cloud storage and CDN behavior without requiring AWS or Cloudinary credentials.

## What Is Done

- Storage database table created: `storage_files`
- File metadata CRUD APIs created
- JWT authentication and owner/admin authorization added
- Client and Professional file ownership supported
- Public/private access level supported
- Local S3-style object key generated for every file
- Local CDN-style URL generated for every file
- Signed-style access URL endpoint added for demo
- Swagger documentation updated
- Module map endpoint added

## Database Table

Table: `storage_files`

Main fields:

- `user_id`
- `owner_type`
- `owner_id`
- `folder`
- `file_name`
- `mime_type`
- `size_bytes`
- `storage_provider`
- `bucket`
- `object_key`
- `cdn_url`
- `access_level`
- `status`
- `checksum`

## API Endpoints

| Method | URL | Purpose |
| --- | --- | --- |
| GET | `/api/modules/file-storage` | Show this backend module |
| GET | `/api/storage/files` | List files |
| POST | `/api/storage/files` | Create file metadata and CDN URL |
| GET | `/api/storage/files/:id` | Get one file record |
| PUT | `/api/storage/files/:id` | Update file metadata/status/access |
| DELETE | `/api/storage/files/:id` | Delete file metadata |
| GET | `/api/storage/files/:id/access-url` | Generate signed-style access URL |
| GET | `/cdn/:objectKey` | Local CDN simulator |

## Demo Request

Use a login token from `/api/auth/login`, then call:

```json
POST /api/storage/files
{
  "folder": "professional-documents",
  "fileName": "certificate.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 245760,
  "accessLevel": "PRIVATE",
  "checksum": "demo-checksum"
}
```

Response includes:

- `objectKey`
- `cdnUrl`
- local upload instruction
- database record ID

## How To Show

Run backend:

```powershell
cd D:\skill-shine-gateway-main\backend
npm run dev
```

Open:

- `http://localhost:5000/docs`
- `http://localhost:5000/api/modules/file-storage`
- `http://localhost:5000/api/db/full`

## Status

Completed for local backend demonstration. Real cloud upload can be connected later by replacing `LOCAL_S3_SIMULATOR` with AWS S3, Cloudinary, Firebase Storage, or another provider.
