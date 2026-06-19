export const professionalModule = {
  key: "professional",
  title: "Professional Backend Module",
  basePath: "/api/professionals",
  role: "PROFESSIONAL",
  description:
    "Handles professional registration, professional profile data, skills, category, city, verification status, and professional CRUD operations.",
  databaseTables: ["users", "professionals"],
  endpoints: [
    { method: "POST", path: "/api/auth/register", purpose: "Register a PROFESSIONAL user" },
    { method: "POST", path: "/api/auth/login", purpose: "Login and receive JWT" },
    { method: "GET", path: "/api/auth/me", purpose: "Read current JWT user" },
    { method: "GET", path: "/api/professionals", purpose: "List professional profiles" },
    { method: "POST", path: "/api/professionals", purpose: "Create professional profile" },
    { method: "GET", path: "/api/professionals/:id", purpose: "Read one professional profile" },
    { method: "PUT", path: "/api/professionals/:id", purpose: "Update one professional profile" },
    { method: "DELETE", path: "/api/professionals/:id", purpose: "Delete one professional profile" },
  ],
  setupFiles: [
    "backend/src/controllers.mjs",
    "backend/src/repositories.mjs",
    "backend/src/validators.mjs",
    "backend/src/db.mjs",
  ],
};
