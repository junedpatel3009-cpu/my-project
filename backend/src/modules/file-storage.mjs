export const fileStorageModule = {
  key: "file-storage",
  title: "File Storage (S3 / Cloud) & CDN Backend Module",
  basePath: "/api/storage/files",
  role: "CLIENT, PROFESSIONAL, ADMIN",
  description:
    "Handles file metadata, local S3-style object keys, public/private access levels, CDN-style URLs, signed access URL simulation, and storage lifecycle status.",
  databaseTables: ["users", "storage_files"],
  endpoints: [
    { method: "GET", path: "/api/storage/files", purpose: "List own, admin, or public storage files" },
    { method: "POST", path: "/api/storage/files", purpose: "Create file metadata and generate object/CDN URLs" },
    { method: "GET", path: "/api/storage/files/:id", purpose: "Read one file metadata record" },
    { method: "PUT", path: "/api/storage/files/:id", purpose: "Update file metadata, access level, or status" },
    { method: "DELETE", path: "/api/storage/files/:id", purpose: "Delete one file metadata record" },
    { method: "GET", path: "/api/storage/files/:id/access-url", purpose: "Generate local signed-style CDN access URL" },
    { method: "GET", path: "/cdn/:objectKey", purpose: "Local CDN simulator endpoint for demo" },
  ],
  setupFiles: [
    "backend/src/controllers.mjs",
    "backend/src/repositories.mjs",
    "backend/src/validators.mjs",
    "backend/src/db.mjs",
    "backend/src/modules/file-storage.mjs",
  ],
};
