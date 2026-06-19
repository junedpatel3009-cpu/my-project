export const mapsLocationModule = {
  key: "maps-location",
  title: "Maps & Location Backend Module",
  basePath: "/api/locations",
  role: "CLIENT, PROFESSIONAL, ADMIN",
  description:
    "Handles saved locations, latitude/longitude storage, public/private visibility, primary locations, distance calculation, and nearby location search.",
  databaseTables: ["users", "locations"],
  endpoints: [
    { method: "GET", path: "/api/locations", purpose: "List own, admin, or public locations" },
    { method: "POST", path: "/api/locations", purpose: "Create saved location" },
    { method: "GET", path: "/api/locations/:id", purpose: "Read one location" },
    { method: "PUT", path: "/api/locations/:id", purpose: "Update one location" },
    { method: "DELETE", path: "/api/locations/:id", purpose: "Delete one location" },
    { method: "POST", path: "/api/locations/distance", purpose: "Calculate distance between two coordinates" },
    { method: "GET", path: "/api/locations/nearby", purpose: "Find public locations near a coordinate" },
  ],
  setupFiles: [
    "backend/src/controllers.mjs",
    "backend/src/repositories.mjs",
    "backend/src/validators.mjs",
    "backend/src/db.mjs",
  ],
};
