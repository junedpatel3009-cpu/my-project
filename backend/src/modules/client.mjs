export const clientModule = {
  key: "client",
  title: "Client Backend Module",
  basePath: "/api/clients",
  role: "CLIENT",
  description: "Handles client registration, client profile data, company details, and client CRUD operations.",
  databaseTables: ["users", "clients"],
  endpoints: [
    { method: "POST", path: "/api/auth/register", purpose: "Register a CLIENT user" },
    { method: "POST", path: "/api/auth/login", purpose: "Login and receive JWT" },
    { method: "GET", path: "/api/auth/me", purpose: "Read current JWT user" },
    { method: "GET", path: "/api/clients", purpose: "List client profiles" },
    { method: "POST", path: "/api/clients", purpose: "Create client profile" },
    { method: "GET", path: "/api/clients/:id", purpose: "Read one client profile" },
    { method: "PUT", path: "/api/clients/:id", purpose: "Update one client profile" },
    { method: "DELETE", path: "/api/clients/:id", purpose: "Delete one client profile" },
  ],
  setupFiles: [
    "backend/src/controllers.mjs",
    "backend/src/repositories.mjs",
    "backend/src/validators.mjs",
    "backend/src/db.mjs",
  ],
};
