import { clientModule } from "./client.mjs";
import { fileStorageModule } from "./file-storage.mjs";
import { mapsLocationModule } from "./maps-location.mjs";
import { professionalModule } from "./professional.mjs";

export const backendArchitecture = {
  title: "Project Architecture & Setup",
  runtime: "Node.js HTTP REST API",
  database: "SQLite",
  authentication: "JWT bearer token",
  documentation: "Swagger/OpenAPI",
  modules: [clientModule, professionalModule, mapsLocationModule, fileStorageModule],
};
