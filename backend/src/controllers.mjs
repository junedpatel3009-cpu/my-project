import { config } from "./config.mjs";
import {
  clientCreateSchema,
  clientUpdateSchema,
  distanceSchema,
  locationCreateSchema,
  locationUpdateSchema,
  loginSchema,
  professionalCreateSchema,
  professionalUpdateSchema,
  registerSchema,
  storageFileCreateSchema,
  storageFileUpdateSchema,
  validate,
} from "./validators.mjs";
import {
  conflict,
  forbidden,
  notFound,
  unauthorized,
  validationError,
} from "./errors.mjs";
import {
  createClient,
  createLocation,
  createProfessional,
  createUser,
  deleteClient,
  deleteLocation,
  deleteProfessional,
  deleteStorageFile,
  findNearbyLocations,
  findClientById,
  findClientByUserId,
  findClientRowById,
  findLocationById,
  findLocationRowById,
  findProfessionalById,
  findProfessionalByUserId,
  findProfessionalRowById,
  findStorageFileById,
  findStorageFileRowById,
  findUserByEmail,
  findUserById,
  listClients,
  listLocations,
  listProfessionals,
  listStorageFiles,
  calculateDistanceKm,
  updateClient,
  updateLocation,
  updateProfessional,
  updateStorageFile,
  createStorageFile,
} from "./repositories.mjs";
import {
  getBearerToken,
  hashPassword,
  publicUser,
  signJwt,
  verifyJwt,
  verifyPassword,
} from "./utils.mjs";

export function requireAuth(req) {
  const token = getBearerToken(req);
  if (!token) throw unauthorized();

  const payload = verifyJwt(token, config.jwtSecret);
  if (!payload?.sub) throw unauthorized("Invalid or expired token.");

  const user = findUserById(Number(payload.sub));
  if (!user) throw unauthorized("Token user no longer exists.");

  return publicUser(user);
}

export function requireRole(user, roles) {
  if (!roles.includes(user.role)) {
    throw forbidden(`Requires one of these roles: ${roles.join(", ")}.`);
  }
}

export async function register(req, body) {
  const parsed = validate(registerSchema, body);
  if (!parsed.ok) throw validationError(parsed.details);

  if (findUserByEmail(parsed.data.email)) {
    throw conflict("A user with this email already exists.");
  }

  const user = createUser({
    role: parsed.data.role,
    name: parsed.data.name,
    email: parsed.data.email,
    passwordHash: hashPassword(parsed.data.password),
  });

  const token = signJwt({ sub: user.id, role: user.role, email: user.email }, config.jwtSecret);
  return { status: 201, body: { user, token } };
}

export async function login(req, body) {
  const parsed = validate(loginSchema, body);
  if (!parsed.ok) throw validationError(parsed.details);

  const userRow = findUserByEmail(parsed.data.email);
  if (!userRow || !verifyPassword(parsed.data.password, userRow.password_hash)) {
    throw unauthorized("Invalid email or password.");
  }

  const user = publicUser(userRow);
  const token = signJwt({ sub: user.id, role: user.role, email: user.email }, config.jwtSecret);
  return { status: 200, body: { user, token } };
}

export async function me(req) {
  const user = requireAuth(req);
  return { status: 200, body: { user } };
}

export async function getClients(req) {
  const user = requireAuth(req);
  requireRole(user, ["ADMIN", "CLIENT", "PROFESSIONAL"]);
  return { status: 200, body: { data: listClients() } };
}

export async function getClient(req, id) {
  const user = requireAuth(req);
  const client = findClientById(id);
  if (!client) throw notFound("Client profile not found.");
  ensureClientAccess(user, client.userId);
  return { status: 200, body: { data: client } };
}

export async function postClient(req, body) {
  const user = requireAuth(req);
  requireRole(user, ["ADMIN", "CLIENT"]);

  const parsed = validate(clientCreateSchema, body);
  if (!parsed.ok) throw validationError(parsed.details);

  const targetUserId = user.role === "ADMIN" ? parsed.data.userId : user.id;
  if (!targetUserId) throw validationError([{ path: "userId", message: "userId is required for admin-created clients." }]);

  const targetUser = findUserById(targetUserId);
  if (!targetUser || targetUser.role !== "CLIENT") {
    throw validationError([{ path: "userId", message: "Client profile must belong to a CLIENT user." }]);
  }

  if (findClientByUserId(targetUserId)) {
    throw conflict("Client profile already exists for this user.");
  }

  const client = createClient({ ...parsed.data, userId: targetUserId });
  return { status: 201, body: { data: client } };
}

export async function putClient(req, id, body) {
  const user = requireAuth(req);
  const current = findClientRowById(id);
  if (!current) throw notFound("Client profile not found.");
  ensureClientAccess(user, current.user_id);

  const parsed = validate(clientUpdateSchema, body);
  if (!parsed.ok) throw validationError(parsed.details);

  return { status: 200, body: { data: updateClient(id, parsed.data) } };
}

export async function removeClient(req, id) {
  const user = requireAuth(req);
  const current = findClientRowById(id);
  if (!current) throw notFound("Client profile not found.");
  ensureClientAccess(user, current.user_id);

  deleteClient(id);
  return { status: 200, body: { ok: true } };
}

export async function getProfessionals(req) {
  const user = requireAuth(req);
  requireRole(user, ["ADMIN", "CLIENT", "PROFESSIONAL"]);
  return { status: 200, body: { data: listProfessionals() } };
}

export async function getProfessional(req, id) {
  const user = requireAuth(req);
  const professional = findProfessionalById(id);
  if (!professional) throw notFound("Professional profile not found.");
  ensureProfessionalAccess(user, professional.userId);
  return { status: 200, body: { data: professional } };
}

export async function postProfessional(req, body) {
  const user = requireAuth(req);
  requireRole(user, ["ADMIN", "PROFESSIONAL"]);

  const parsed = validate(professionalCreateSchema, body);
  if (!parsed.ok) throw validationError(parsed.details);

  const targetUserId = user.role === "ADMIN" ? parsed.data.userId : user.id;
  if (!targetUserId) {
    throw validationError([{ path: "userId", message: "userId is required for admin-created professionals." }]);
  }

  const targetUser = findUserById(targetUserId);
  if (!targetUser || targetUser.role !== "PROFESSIONAL") {
    throw validationError([{ path: "userId", message: "Professional profile must belong to a PROFESSIONAL user." }]);
  }

  if (findProfessionalByUserId(targetUserId)) {
    throw conflict("Professional profile already exists for this user.");
  }

  const professional = createProfessional({ ...parsed.data, userId: targetUserId });
  return { status: 201, body: { data: professional } };
}

export async function putProfessional(req, id, body) {
  const user = requireAuth(req);
  const current = findProfessionalRowById(id);
  if (!current) throw notFound("Professional profile not found.");
  ensureProfessionalAccess(user, current.user_id);

  const parsed = validate(professionalUpdateSchema, body);
  if (!parsed.ok) throw validationError(parsed.details);

  return { status: 200, body: { data: updateProfessional(id, parsed.data) } };
}

export async function removeProfessional(req, id) {
  const user = requireAuth(req);
  const current = findProfessionalRowById(id);
  if (!current) throw notFound("Professional profile not found.");
  ensureProfessionalAccess(user, current.user_id);

  deleteProfessional(id);
  return { status: 200, body: { ok: true } };
}

export async function getLocations(req, url) {
  const user = requireAuth(req);
  const filters = {};

  const ownerType = url.searchParams.get("ownerType");
  const scope = url.searchParams.get("scope") || "mine";

  if (ownerType) {
    filters.ownerType = ownerType.toUpperCase();
  }

  if (scope === "public") {
    filters.visibility = "PUBLIC";
  } else if (user.role !== "ADMIN") {
    filters.userId = user.id;
  }

  return { status: 200, body: { data: listLocations(filters) } };
}

export async function getLocation(req, id) {
  const user = requireAuth(req);
  const location = findLocationById(id);
  if (!location) throw notFound("Location not found.");
  ensureLocationAccess(user, location);
  return { status: 200, body: { data: location } };
}

export async function postLocation(req, body) {
  const user = requireAuth(req);
  const parsed = validate(locationCreateSchema, body);
  if (!parsed.ok) throw validationError(parsed.details);

  const targetUserId = user.role === "ADMIN" ? parsed.data.userId ?? user.id : user.id;
  const targetUser = findUserById(targetUserId);
  if (!targetUser) {
    throw validationError([{ path: "userId", message: "Location user does not exist." }]);
  }

  const ownerType = user.role === "ADMIN" ? parsed.data.ownerType ?? targetUser.role : user.role;
  if (!["CLIENT", "PROFESSIONAL"].includes(ownerType)) {
    throw validationError([{ path: "ownerType", message: "Location owner must be CLIENT or PROFESSIONAL." }]);
  }

  if (targetUser.role !== ownerType) {
    throw validationError([{ path: "ownerType", message: "ownerType must match the target user's role." }]);
  }

  const location = createLocation({
    ...parsed.data,
    userId: targetUserId,
    ownerType,
  });

  return { status: 201, body: { data: location } };
}

export async function putLocation(req, id, body) {
  const user = requireAuth(req);
  const current = findLocationRowById(id);
  if (!current) throw notFound("Location not found.");
  ensureLocationRowAccess(user, current);

  const parsed = validate(locationUpdateSchema, body);
  if (!parsed.ok) throw validationError(parsed.details);

  return { status: 200, body: { data: updateLocation(id, parsed.data) } };
}

export async function removeLocation(req, id) {
  const user = requireAuth(req);
  const current = findLocationRowById(id);
  if (!current) throw notFound("Location not found.");
  ensureLocationRowAccess(user, current);

  deleteLocation(id);
  return { status: 200, body: { ok: true } };
}

export async function postDistance(req, body) {
  const parsed = validate(distanceSchema, body);
  if (!parsed.ok) throw validationError(parsed.details);

  const distanceKm = calculateDistanceKm(
    parsed.data.from.latitude,
    parsed.data.from.longitude,
    parsed.data.to.latitude,
    parsed.data.to.longitude,
  );

  return {
    status: 200,
    body: {
      distanceKm,
      distanceMiles: Number((distanceKm * 0.621371).toFixed(2)),
    },
  };
}

export async function getNearbyLocations(req, url) {
  requireAuth(req);

  const latitude = Number(url.searchParams.get("latitude"));
  const longitude = Number(url.searchParams.get("longitude"));
  const radiusKm = Number(url.searchParams.get("radiusKm") || 25);
  const ownerType = url.searchParams.get("ownerType")?.toUpperCase();

  if (
    Number.isNaN(latitude) ||
    Number.isNaN(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180 ||
    Number.isNaN(radiusKm) ||
    radiusKm <= 0
  ) {
    throw validationError([
      { path: "latitude", message: "Valid latitude is required." },
      { path: "longitude", message: "Valid longitude is required." },
      { path: "radiusKm", message: "radiusKm must be greater than 0." },
    ]);
  }

  return {
    status: 200,
    body: {
      data: findNearbyLocations({ latitude, longitude, radiusKm, ownerType }),
    },
  };
}

export async function getStorageFiles(req, url) {
  const user = requireAuth(req);
  const filters = {};

  const ownerType = url.searchParams.get("ownerType");
  const accessLevel = url.searchParams.get("accessLevel");
  const status = url.searchParams.get("status");
  const scope = url.searchParams.get("scope") || "mine";

  if (ownerType) filters.ownerType = ownerType.toUpperCase();
  if (accessLevel) filters.accessLevel = accessLevel.toUpperCase();
  if (status) filters.status = status.toUpperCase();

  if (scope === "public") {
    filters.accessLevel = "PUBLIC";
  } else if (user.role !== "ADMIN") {
    filters.userId = user.id;
  }

  return { status: 200, body: { data: listStorageFiles(filters) } };
}

export async function getStorageFile(req, id) {
  const user = requireAuth(req);
  const file = findStorageFileById(id);
  if (!file) throw notFound("Storage file not found.");
  ensureStorageFileAccess(user, file);
  return { status: 200, body: { data: file } };
}

export async function postStorageFile(req, body) {
  const user = requireAuth(req);
  const parsed = validate(storageFileCreateSchema, body);
  if (!parsed.ok) throw validationError(parsed.details);

  const targetUserId = user.role === "ADMIN" ? parsed.data.userId ?? user.id : user.id;
  const targetUser = findUserById(targetUserId);
  if (!targetUser) {
    throw validationError([{ path: "userId", message: "Storage file user does not exist." }]);
  }

  const ownerType = user.role === "ADMIN" ? parsed.data.ownerType ?? targetUser.role : user.role;
  if (!["CLIENT", "PROFESSIONAL"].includes(ownerType)) {
    throw validationError([{ path: "ownerType", message: "File owner must be CLIENT or PROFESSIONAL." }]);
  }

  if (targetUser.role !== ownerType) {
    throw validationError([{ path: "ownerType", message: "ownerType must match the target user's role." }]);
  }

  const file = createStorageFile({
    ...parsed.data,
    userId: targetUserId,
    ownerType,
  });

  return {
    status: 201,
    body: {
      data: file,
      upload: {
        method: "PUT",
        url: file.cdnUrl,
        note: "Local S3/CDN simulator. Store the binary in cloud later using this objectKey.",
      },
    },
  };
}

export async function putStorageFile(req, id, body) {
  const user = requireAuth(req);
  const current = findStorageFileRowById(id);
  if (!current) throw notFound("Storage file not found.");
  ensureStorageFileRowAccess(user, current);

  const parsed = validate(storageFileUpdateSchema, body);
  if (!parsed.ok) throw validationError(parsed.details);

  return { status: 200, body: { data: updateStorageFile(id, parsed.data) } };
}

export async function removeStorageFile(req, id) {
  const user = requireAuth(req);
  const current = findStorageFileRowById(id);
  if (!current) throw notFound("Storage file not found.");
  ensureStorageFileRowAccess(user, current);

  deleteStorageFile(id);
  return { status: 200, body: { ok: true } };
}

export async function getStorageAccessUrl(req, id) {
  const user = requireAuth(req);
  const file = findStorageFileById(id);
  if (!file) throw notFound("Storage file not found.");
  ensureStorageFileAccess(user, file);

  return {
    status: 200,
    body: {
      data: {
        fileId: file.id,
        objectKey: file.objectKey,
        cdnUrl: file.cdnUrl,
        signedUrl: `${file.cdnUrl}?token=local-demo-${file.id}`,
        expiresInSeconds: 900,
      },
    },
  };
}

function ensureClientAccess(user, ownerUserId) {
  if (user.role === "ADMIN") return;
  if (user.role === "CLIENT" && user.id === ownerUserId) return;
  throw forbidden("You can only access your own client profile.");
}

function ensureProfessionalAccess(user, ownerUserId) {
  if (user.role === "ADMIN") return;
  if (user.role === "PROFESSIONAL" && user.id === ownerUserId) return;
  throw forbidden("You can only access your own professional profile.");
}

function ensureLocationAccess(user, location) {
  if (location.visibility === "PUBLIC") return;
  if (user.role === "ADMIN") return;
  if (user.id === location.userId) return;
  throw forbidden("You can only access your own private locations.");
}

function ensureLocationRowAccess(user, location) {
  if (user.role === "ADMIN") return;
  if (user.id === location.user_id) return;
  throw forbidden("You can only manage your own locations.");
}

function ensureStorageFileAccess(user, file) {
  if (file.accessLevel === "PUBLIC") return;
  if (user.role === "ADMIN") return;
  if (user.id === file.userId) return;
  throw forbidden("You can only access your own private files.");
}

function ensureStorageFileRowAccess(user, file) {
  if (user.role === "ADMIN") return;
  if (user.id === file.user_id) return;
  throw forbidden("You can only manage your own files.");
}
