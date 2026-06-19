import http from "node:http";
import { fileURLToPath } from "node:url";
import { config } from "./config.mjs";
import { getDatabaseOverview, getDatabaseStatus, getTableData } from "./db.mjs";
import { HttpError } from "./errors.mjs";
import { openApiDocument, swaggerHtml } from "./openapi.mjs";
import { backendArchitecture } from "./modules/index.mjs";
import {
  getClient,
  getClients,
  getProfessional,
  getProfessionals,
  getStorageAccessUrl,
  getStorageFile,
  getStorageFiles,
  getLocation,
  getLocations,
  getNearbyLocations,
  login,
  me,
  postDistance,
  postClient,
  postLocation,
  postProfessional,
  postStorageFile,
  putClient,
  putLocation,
  putProfessional,
  putStorageFile,
  register,
  removeClient,
  removeLocation,
  removeProfessional,
  removeStorageFile,
} from "./controllers.mjs";
import { parseJsonBody, sendHtml, sendJson } from "./utils.mjs";

const routes = [
  ["GET", /^\/health$/, async () => ({ status: 200, body: healthPayload() })],
  ["GET", /^\/api\/architecture$/, async () => ({ status: 200, body: backendArchitecture })],
  ["GET", /^\/api\/modules\/client$/, async () => ({ status: 200, body: backendArchitecture.modules.find((module) => module.key === "client") })],
  ["GET", /^\/api\/modules\/professional$/, async () => ({ status: 200, body: backendArchitecture.modules.find((module) => module.key === "professional") })],
  ["GET", /^\/api\/modules\/maps-location$/, async () => ({ status: 200, body: backendArchitecture.modules.find((module) => module.key === "maps-location") })],
  ["GET", /^\/api\/modules\/file-storage$/, async () => ({ status: 200, body: backendArchitecture.modules.find((module) => module.key === "file-storage") })],
  ["GET", /^\/api\/db\/status$/, async () => ({ status: 200, body: getDatabaseStatus() })],
  ["GET", /^\/api\/db\/full$/, async () => ({ status: 200, body: getDatabaseOverview() })],
  [
    "GET",
    /^\/api\/db\/tables\/([a-zA-Z0-9_]+)$/,
    (req, body, match, url) => {
      const table = getTableData(match[1], Number(url.searchParams.get("limit") || 50));
      if (!table) return { status: 404, body: { error: { message: "Database table not found." } } };
      return { status: 200, body: table };
    },
  ],
  ["GET", /^\/openapi\.json$/, async () => ({ status: 200, body: openApiDocument })],
  ["GET", /^\/docs$/, async () => ({ status: 200, html: swaggerHtml() })],
  ["POST", /^\/api\/auth\/register$/, register],
  ["POST", /^\/api\/auth\/login$/, login],
  ["GET", /^\/api\/auth\/me$/, me],
  ["GET", /^\/api\/clients$/, getClients],
  ["POST", /^\/api\/clients$/, postClient],
  ["GET", /^\/api\/clients\/(\d+)$/, (req, body, match) => getClient(req, Number(match[1]))],
  ["PUT", /^\/api\/clients\/(\d+)$/, (req, body, match) => putClient(req, Number(match[1]), body)],
  ["DELETE", /^\/api\/clients\/(\d+)$/, (req, body, match) => removeClient(req, Number(match[1]))],
  ["GET", /^\/api\/locations$/, (req, body, match, url) => getLocations(req, url)],
  ["POST", /^\/api\/locations$/, postLocation],
  ["GET", /^\/api\/locations\/nearby$/, (req, body, match, url) => getNearbyLocations(req, url)],
  ["POST", /^\/api\/locations\/distance$/, postDistance],
  ["GET", /^\/api\/locations\/(\d+)$/, (req, body, match) => getLocation(req, Number(match[1]))],
  ["PUT", /^\/api\/locations\/(\d+)$/, (req, body, match) => putLocation(req, Number(match[1]), body)],
  ["DELETE", /^\/api\/locations\/(\d+)$/, (req, body, match) => removeLocation(req, Number(match[1]))],
  ["GET", /^\/api\/storage\/files$/, (req, body, match, url) => getStorageFiles(req, url)],
  ["POST", /^\/api\/storage\/files$/, postStorageFile],
  ["GET", /^\/api\/storage\/files\/(\d+)\/access-url$/, (req, body, match) => getStorageAccessUrl(req, Number(match[1]))],
  ["GET", /^\/api\/storage\/files\/(\d+)$/, (req, body, match) => getStorageFile(req, Number(match[1]))],
  ["PUT", /^\/api\/storage\/files\/(\d+)$/, (req, body, match) => putStorageFile(req, Number(match[1]), body)],
  ["DELETE", /^\/api\/storage\/files\/(\d+)$/, (req, body, match) => removeStorageFile(req, Number(match[1]))],
  ["GET", /^\/cdn\/(.+)$/, (req, body, match) => getLocalCdnObject(match[1])],
  ["GET", /^\/api\/professionals$/, getProfessionals],
  ["POST", /^\/api\/professionals$/, postProfessional],
  ["GET", /^\/api\/professionals\/(\d+)$/, (req, body, match) => getProfessional(req, Number(match[1]))],
  ["PUT", /^\/api\/professionals\/(\d+)$/, (req, body, match) => putProfessional(req, Number(match[1]), body)],
  ["DELETE", /^\/api\/professionals\/(\d+)$/, (req, body, match) => removeProfessional(req, Number(match[1]))],
];

export const server = http.createServer(async (req, res) => {
  try {
    setCorsHeaders(res);

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const route = routes.find(([method, pattern]) => method === req.method && pattern.test(url.pathname));

    if (!route) {
      sendJson(res, 404, { error: { message: "Route not found." } });
      return;
    }

    const [, pattern, handler] = route;
    const match = url.pathname.match(pattern);
    const body = ["POST", "PUT", "PATCH"].includes(req.method || "") ? await parseJsonBody(req) : {};
    const result = await handler(req, body, match, url);

    if (result.html) {
      sendHtml(res, result.status, result.html);
      return;
    }

    sendJson(res, result.status, result.body);
  } catch (error) {
    handleError(res, error);
  }
});

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  server.listen(config.port, () => {
    console.log(`Backend API running on http://localhost:${config.port}`);
    console.log(`Swagger docs available at http://localhost:${config.port}/docs`);
  });
}

function healthPayload() {
  return {
    ok: true,
    service: "skill-shine-backend-api",
    database: config.dbPath,
    docs: `http://localhost:${config.port}/docs`,
    timestamp: new Date().toISOString(),
  };
}

function getLocalCdnObject(objectKey) {
  return {
    status: 200,
    body: {
      ok: true,
      provider: "LOCAL_S3_SIMULATOR",
      objectKey: decodeURIComponent(objectKey),
      message: "CDN route is reachable. Binary upload can be connected to S3/Cloudinary later.",
    },
  };
}

function setCorsHeaders(res) {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type,authorization");
}

function handleError(res, error) {
  if (error instanceof HttpError) {
    sendJson(res, error.status, {
      error: {
        message: error.message,
        details: error.details,
      },
    });
    return;
  }

  const message = error instanceof Error ? error.message : "Internal server error.";
  const status = message.includes("valid JSON") || message.includes("too large") ? 400 : 500;
  sendJson(res, status, { error: { message } });
}
