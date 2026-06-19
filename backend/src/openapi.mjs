export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Skill Shine Backend API",
    version: "1.0.0",
    description: "Standalone REST API for users, clients, professionals, locations, file storage/CDN, JWT auth, and CRUD operations.",
  },
  servers: [{ url: "http://localhost:5000" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        responses: { 200: { description: "Backend is running" } },
      },
    },
    "/api/architecture": {
      get: {
        summary: "Project architecture split into Client and Professional backend modules",
        responses: {
          200: {
            description: "Backend architecture module map",
            content: {
              "application/json": {
                example: {
                  title: "Project Architecture & Setup",
                  runtime: "Node.js HTTP REST API",
                  database: "SQLite",
                  authentication: "JWT bearer token",
                  modules: [
                    { key: "client", title: "Client Backend Module", basePath: "/api/clients" },
                    { key: "professional", title: "Professional Backend Module", basePath: "/api/professionals" },
                  ],
                },
              },
            },
          },
        },
      },
    },
    "/api/modules/client": {
      get: {
        summary: "Client module API map",
        responses: {
          200: {
            description: "Client backend module metadata, endpoints, files, and database tables",
          },
        },
      },
    },
    "/api/modules/professional": {
      get: {
        summary: "Professional module API map",
        responses: {
          200: {
            description: "Professional backend module metadata, endpoints, files, and database tables",
          },
        },
      },
    },
    "/api/modules/maps-location": {
      get: {
        summary: "Maps & Location module API map",
        responses: {
          200: {
            description: "Maps & Location backend module metadata, endpoints, files, and database tables",
          },
        },
      },
    },
    "/api/modules/file-storage": {
      get: {
        summary: "File Storage & CDN module API map",
        responses: {
          200: {
            description: "File Storage backend module metadata, endpoints, files, and database tables",
          },
        },
      },
    },
    "/api/db/status": {
      get: {
        summary: "Database connection status",
        responses: {
          200: {
            description: "SQLite connection, table list, and row counts",
            content: {
              "application/json": {
                example: {
                  connected: true,
                  type: "sqlite",
                  path: "D:\\skill-shine-gateway-main\\backend\\data\\backend.sqlite",
                  tables: ["clients", "professionals", "users"],
                  counts: { users: 1, clients: 0, professionals: 0 },
                },
              },
            },
          },
        },
      },
    },
    "/api/db/full": {
      get: {
        summary: "Full read-only database overview",
        responses: {
          200: {
            description: "Database metadata, tables, columns, indexes, foreign keys, counts, and sample rows",
          },
        },
      },
    },
    "/api/db/tables/{tableName}": {
      get: {
        summary: "Read table rows",
        parameters: [
          { name: "tableName", in: "path", required: true, schema: { type: "string" } },
          { name: "limit", in: "query", required: false, schema: { type: "integer", default: 50 } },
        ],
        responses: {
          200: { description: "Rows from one database table" },
          404: { description: "Table not found" },
        },
      },
    },
    "/api/auth/register": {
      post: {
        summary: "Register a client or professional user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              example: {
                role: "CLIENT",
                name: "Jane Client",
                email: "client@example.com",
                password: "password123",
              },
            },
          },
        },
        responses: { 201: { description: "Registered user and JWT token" } },
      },
    },
    "/api/auth/login": {
      post: {
        summary: "Login and receive JWT token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              example: { email: "client@example.com", password: "password123" },
            },
          },
        },
        responses: { 200: { description: "JWT token" } },
      },
    },
    "/api/auth/me": {
      get: {
        summary: "Get current authenticated user",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Current user" } },
      },
    },
    "/api/clients": {
      get: {
        summary: "List clients",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Client list" } },
      },
      post: {
        summary: "Create client profile",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              example: {
                companyName: "Acme Inc",
                contactName: "Jane Client",
                phone: "+15550001111",
                address: "New York",
                industry: "Technology",
                notes: "Needs trusted service providers",
              },
            },
          },
        },
        responses: { 201: { description: "Client profile created" } },
      },
    },
    "/api/clients/{id}": {
      get: {
        summary: "Get client profile",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Client profile" } },
      },
      put: {
        summary: "Update client profile",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Client profile updated" } },
      },
      delete: {
        summary: "Delete client profile",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Client profile deleted" } },
      },
    },
    "/api/locations": {
      get: {
        summary: "List saved locations",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "scope", in: "query", required: false, schema: { type: "string", enum: ["mine", "public"] } },
          { name: "ownerType", in: "query", required: false, schema: { type: "string", enum: ["CLIENT", "PROFESSIONAL"] } },
        ],
        responses: { 200: { description: "Location list" } },
      },
      post: {
        summary: "Create saved location",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              example: {
                label: "Office",
                address: "New York, NY",
                latitude: 40.7128,
                longitude: -74.006,
                radiusKm: 25,
                isPrimary: true,
                visibility: "PUBLIC",
              },
            },
          },
        },
        responses: { 201: { description: "Location created" } },
      },
    },
    "/api/locations/distance": {
      post: {
        summary: "Calculate distance between two coordinates",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              example: {
                from: { latitude: 40.7128, longitude: -74.006 },
                to: { latitude: 42.3601, longitude: -71.0589 },
              },
            },
          },
        },
        responses: { 200: { description: "Distance in km and miles" } },
      },
    },
    "/api/locations/nearby": {
      get: {
        summary: "Find public locations near a coordinate",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "latitude", in: "query", required: true, schema: { type: "number" } },
          { name: "longitude", in: "query", required: true, schema: { type: "number" } },
          { name: "radiusKm", in: "query", required: false, schema: { type: "number", default: 25 } },
          { name: "ownerType", in: "query", required: false, schema: { type: "string", enum: ["CLIENT", "PROFESSIONAL"] } },
        ],
        responses: { 200: { description: "Nearby public locations" } },
      },
    },
    "/api/locations/{id}": {
      get: {
        summary: "Get saved location",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Location detail" } },
      },
      put: {
        summary: "Update saved location",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Location updated" } },
      },
      delete: {
        summary: "Delete saved location",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Location deleted" } },
      },
    },
    "/api/storage/files": {
      get: {
        summary: "List storage files",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "scope", in: "query", required: false, schema: { type: "string", enum: ["mine", "public"] } },
          { name: "ownerType", in: "query", required: false, schema: { type: "string", enum: ["CLIENT", "PROFESSIONAL"] } },
          { name: "accessLevel", in: "query", required: false, schema: { type: "string", enum: ["PRIVATE", "PUBLIC"] } },
          { name: "status", in: "query", required: false, schema: { type: "string", enum: ["PENDING", "READY", "ARCHIVED"] } },
        ],
        responses: { 200: { description: "Storage file list" } },
      },
      post: {
        summary: "Create file metadata and generate CDN URL",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              example: {
                folder: "professional-documents",
                fileName: "certificate.pdf",
                mimeType: "application/pdf",
                sizeBytes: 245760,
                accessLevel: "PRIVATE",
                checksum: "demo-checksum",
              },
            },
          },
        },
        responses: { 201: { description: "Storage file metadata created" } },
      },
    },
    "/api/storage/files/{id}/access-url": {
      get: {
        summary: "Generate signed-style local CDN access URL",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Signed-style access URL" } },
      },
    },
    "/api/storage/files/{id}": {
      get: {
        summary: "Get storage file metadata",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Storage file metadata" } },
      },
      put: {
        summary: "Update storage file metadata",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              example: {
                accessLevel: "PUBLIC",
                status: "READY",
              },
            },
          },
        },
        responses: { 200: { description: "Storage file metadata updated" } },
      },
      delete: {
        summary: "Delete storage file metadata",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Storage file deleted" } },
      },
    },
    "/cdn/{objectKey}": {
      get: {
        summary: "Local CDN simulator route",
        parameters: [{ name: "objectKey", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Local CDN simulator response" } },
      },
    },
    "/api/professionals": {
      get: {
        summary: "List professionals",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Professional list" } },
      },
      post: {
        summary: "Create professional profile",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              example: {
                displayName: "Pat Pro",
                category: "Plumbing",
                city: "Boston",
                skills: ["Repairs", "Installations"],
                hourlyRate: 75,
                experienceYears: 8,
                bio: "Licensed service professional",
              },
            },
          },
        },
        responses: { 201: { description: "Professional profile created" } },
      },
    },
    "/api/professionals/{id}": {
      get: {
        summary: "Get professional profile",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Professional profile" } },
      },
      put: {
        summary: "Update professional profile",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Professional profile updated" } },
      },
      delete: {
        summary: "Delete professional profile",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Professional profile deleted" } },
      },
    },
  },
};

export function swaggerHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Skill Shine Backend API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({ url: "/openapi.json", dom_id: "#swagger-ui" });
    </script>
  </body>
</html>`;
}
