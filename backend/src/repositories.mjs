import { db } from "./db.mjs";
import { nowIso, publicUser } from "./utils.mjs";

export function findUserByEmail(email) {
  return db.prepare("SELECT * FROM users WHERE email = ? LIMIT 1").get(email);
}

export function findUserById(id) {
  return db.prepare("SELECT * FROM users WHERE id = ? LIMIT 1").get(id);
}

export function createUser(input) {
  const timestamp = nowIso();
  const result = db.prepare(`
    INSERT INTO users (role, name, email, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(input.role, input.name, input.email, input.passwordHash, timestamp, timestamp);

  return publicUser(findUserById(result.lastInsertRowid));
}

export function listClients() {
  return db.prepare(`
    SELECT clients.*, users.name AS user_name, users.email AS user_email
    FROM clients
    INNER JOIN users ON users.id = clients.user_id
    ORDER BY clients.id DESC
  `).all().map(mapClient);
}

export function findClientById(id) {
  const row = db.prepare(`
    SELECT clients.*, users.name AS user_name, users.email AS user_email
    FROM clients
    INNER JOIN users ON users.id = clients.user_id
    WHERE clients.id = ?
    LIMIT 1
  `).get(id);
  return row ? mapClient(row) : null;
}

export function findClientRowById(id) {
  return db.prepare("SELECT * FROM clients WHERE id = ? LIMIT 1").get(id);
}

export function findClientByUserId(userId) {
  return db.prepare("SELECT * FROM clients WHERE user_id = ? LIMIT 1").get(userId);
}

export function createClient(input) {
  const timestamp = nowIso();
  const result = db.prepare(`
    INSERT INTO clients (
      user_id, company_name, contact_name, phone, address, industry, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.userId,
    input.companyName,
    input.contactName,
    input.phone ?? null,
    input.address ?? null,
    input.industry ?? null,
    input.notes ?? null,
    timestamp,
    timestamp,
  );

  return findClientById(result.lastInsertRowid);
}

export function updateClient(id, input) {
  const current = findClientRowById(id);
  if (!current) return null;

  db.prepare(`
    UPDATE clients
    SET company_name = ?, contact_name = ?, phone = ?, address = ?, industry = ?, notes = ?, updated_at = ?
    WHERE id = ?
  `).run(
    input.companyName ?? current.company_name,
    input.contactName ?? current.contact_name,
    input.phone ?? current.phone,
    input.address ?? current.address,
    input.industry ?? current.industry,
    input.notes ?? current.notes,
    nowIso(),
    id,
  );

  return findClientById(id);
}

export function deleteClient(id) {
  const result = db.prepare("DELETE FROM clients WHERE id = ?").run(id);
  return result.changes > 0;
}

export function listProfessionals() {
  return db.prepare(`
    SELECT professionals.*, users.name AS user_name, users.email AS user_email
    FROM professionals
    INNER JOIN users ON users.id = professionals.user_id
    ORDER BY professionals.id DESC
  `).all().map(mapProfessional);
}

export function findProfessionalById(id) {
  const row = db.prepare(`
    SELECT professionals.*, users.name AS user_name, users.email AS user_email
    FROM professionals
    INNER JOIN users ON users.id = professionals.user_id
    WHERE professionals.id = ?
    LIMIT 1
  `).get(id);
  return row ? mapProfessional(row) : null;
}

export function findProfessionalRowById(id) {
  return db.prepare("SELECT * FROM professionals WHERE id = ? LIMIT 1").get(id);
}

export function findProfessionalByUserId(userId) {
  return db.prepare("SELECT * FROM professionals WHERE user_id = ? LIMIT 1").get(userId);
}

export function createProfessional(input) {
  const timestamp = nowIso();
  const result = db.prepare(`
    INSERT INTO professionals (
      user_id, display_name, category, city, skills_json, hourly_rate, experience_years,
      bio, verification_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.userId,
    input.displayName,
    input.category,
    input.city,
    JSON.stringify(input.skills ?? []),
    input.hourlyRate ?? null,
    input.experienceYears ?? null,
    input.bio ?? null,
    input.verificationStatus ?? "PENDING",
    timestamp,
    timestamp,
  );

  return findProfessionalById(result.lastInsertRowid);
}

export function updateProfessional(id, input) {
  const current = findProfessionalRowById(id);
  if (!current) return null;

  db.prepare(`
    UPDATE professionals
    SET display_name = ?, category = ?, city = ?, skills_json = ?, hourly_rate = ?,
        experience_years = ?, bio = ?, verification_status = ?, updated_at = ?
    WHERE id = ?
  `).run(
    input.displayName ?? current.display_name,
    input.category ?? current.category,
    input.city ?? current.city,
    input.skills ? JSON.stringify(input.skills) : current.skills_json,
    input.hourlyRate ?? current.hourly_rate,
    input.experienceYears ?? current.experience_years,
    input.bio ?? current.bio,
    input.verificationStatus ?? current.verification_status,
    nowIso(),
    id,
  );

  return findProfessionalById(id);
}

export function deleteProfessional(id) {
  const result = db.prepare("DELETE FROM professionals WHERE id = ?").run(id);
  return result.changes > 0;
}

export function listLocations(filters = {}) {
  const clauses = [];
  const params = [];

  if (filters.userId) {
    clauses.push("locations.user_id = ?");
    params.push(filters.userId);
  }

  if (filters.ownerType) {
    clauses.push("locations.owner_type = ?");
    params.push(filters.ownerType);
  }

  if (filters.visibility) {
    clauses.push("locations.visibility = ?");
    params.push(filters.visibility);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  return db.prepare(`
    SELECT locations.*, users.name AS user_name, users.email AS user_email
    FROM locations
    INNER JOIN users ON users.id = locations.user_id
    ${where}
    ORDER BY locations.id DESC
  `).all(...params).map(mapLocation);
}

export function findLocationById(id) {
  const row = db.prepare(`
    SELECT locations.*, users.name AS user_name, users.email AS user_email
    FROM locations
    INNER JOIN users ON users.id = locations.user_id
    WHERE locations.id = ?
    LIMIT 1
  `).get(id);
  return row ? mapLocation(row) : null;
}

export function findLocationRowById(id) {
  return db.prepare("SELECT * FROM locations WHERE id = ? LIMIT 1").get(id);
}

export function createLocation(input) {
  const timestamp = nowIso();

  if (input.isPrimary) {
    db.prepare("UPDATE locations SET is_primary = 0 WHERE user_id = ?").run(input.userId);
  }

  const result = db.prepare(`
    INSERT INTO locations (
      user_id, owner_type, label, address, latitude, longitude, radius_km,
      is_primary, visibility, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.userId,
    input.ownerType,
    input.label,
    input.address,
    input.latitude,
    input.longitude,
    input.radiusKm ?? null,
    input.isPrimary ? 1 : 0,
    input.visibility ?? "PRIVATE",
    timestamp,
    timestamp,
  );

  return findLocationById(result.lastInsertRowid);
}

export function updateLocation(id, input) {
  const current = findLocationRowById(id);
  if (!current) return null;

  if (input.isPrimary) {
    db.prepare("UPDATE locations SET is_primary = 0 WHERE user_id = ?").run(current.user_id);
  }

  db.prepare(`
    UPDATE locations
    SET label = ?, address = ?, latitude = ?, longitude = ?, radius_km = ?,
        is_primary = ?, visibility = ?, updated_at = ?
    WHERE id = ?
  `).run(
    input.label ?? current.label,
    input.address ?? current.address,
    input.latitude ?? current.latitude,
    input.longitude ?? current.longitude,
    input.radiusKm ?? current.radius_km,
    input.isPrimary === undefined ? current.is_primary : input.isPrimary ? 1 : 0,
    input.visibility ?? current.visibility,
    nowIso(),
    id,
  );

  return findLocationById(id);
}

export function deleteLocation(id) {
  const result = db.prepare("DELETE FROM locations WHERE id = ?").run(id);
  return result.changes > 0;
}

export function findNearbyLocations({ latitude, longitude, radiusKm, ownerType }) {
  const locations = listLocations({ visibility: "PUBLIC", ownerType });
  return locations
    .map((location) => ({
      ...location,
      distanceKm: calculateDistanceKm(latitude, longitude, location.latitude, location.longitude),
    }))
    .filter((location) => location.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export function calculateDistanceKm(fromLat, fromLng, toLat, toLng) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((earthRadiusKm * c).toFixed(2));
}

export function listStorageFiles(filters = {}) {
  const clauses = [];
  const params = [];

  if (filters.userId) {
    clauses.push("storage_files.user_id = ?");
    params.push(filters.userId);
  }

  if (filters.ownerType) {
    clauses.push("storage_files.owner_type = ?");
    params.push(filters.ownerType);
  }

  if (filters.accessLevel) {
    clauses.push("storage_files.access_level = ?");
    params.push(filters.accessLevel);
  }

  if (filters.status) {
    clauses.push("storage_files.status = ?");
    params.push(filters.status);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  return db.prepare(`
    SELECT storage_files.*, users.name AS user_name, users.email AS user_email
    FROM storage_files
    INNER JOIN users ON users.id = storage_files.user_id
    ${where}
    ORDER BY storage_files.id DESC
  `).all(...params).map(mapStorageFile);
}

export function findStorageFileById(id) {
  const row = db.prepare(`
    SELECT storage_files.*, users.name AS user_name, users.email AS user_email
    FROM storage_files
    INNER JOIN users ON users.id = storage_files.user_id
    WHERE storage_files.id = ?
    LIMIT 1
  `).get(id);
  return row ? mapStorageFile(row) : null;
}

export function findStorageFileRowById(id) {
  return db.prepare("SELECT * FROM storage_files WHERE id = ? LIMIT 1").get(id);
}

export function createStorageFile(input) {
  const timestamp = nowIso();
  const safeFolder = slugifyPath(input.folder || "general");
  const safeFileName = slugifyFileName(input.fileName);
  const objectKey = `${input.ownerType.toLowerCase()}/${input.userId}/${safeFolder}/${Date.now()}-${safeFileName}`;
  const cdnUrl = `/cdn/${objectKey}`;

  const result = db.prepare(`
    INSERT INTO storage_files (
      user_id, owner_type, owner_id, folder, file_name, mime_type, size_bytes,
      storage_provider, bucket, object_key, cdn_url, access_level, status,
      checksum, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.userId,
    input.ownerType,
    input.ownerId ?? null,
    safeFolder,
    input.fileName,
    input.mimeType,
    input.sizeBytes,
    "LOCAL_S3_SIMULATOR",
    "skill-shine-local",
    objectKey,
    cdnUrl,
    input.accessLevel ?? "PRIVATE",
    "READY",
    input.checksum ?? null,
    timestamp,
    timestamp,
  );

  return findStorageFileById(result.lastInsertRowid);
}

export function updateStorageFile(id, input) {
  const current = findStorageFileRowById(id);
  if (!current) return null;

  const folder = input.folder ? slugifyPath(input.folder) : current.folder;
  const fileName = input.fileName ?? current.file_name;

  db.prepare(`
    UPDATE storage_files
    SET folder = ?, file_name = ?, mime_type = ?, size_bytes = ?, access_level = ?,
        status = ?, checksum = ?, updated_at = ?
    WHERE id = ?
  `).run(
    folder,
    fileName,
    input.mimeType ?? current.mime_type,
    input.sizeBytes ?? current.size_bytes,
    input.accessLevel ?? current.access_level,
    input.status ?? current.status,
    input.checksum ?? current.checksum,
    nowIso(),
    id,
  );

  return findStorageFileById(id);
}

export function deleteStorageFile(id) {
  const result = db.prepare("DELETE FROM storage_files WHERE id = ?").run(id);
  return result.changes > 0;
}

function mapClient(row) {
  return {
    id: row.id,
    userId: row.user_id,
    user: { name: row.user_name, email: row.user_email },
    companyName: row.company_name,
    contactName: row.contact_name,
    phone: row.phone,
    address: row.address,
    industry: row.industry,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProfessional(row) {
  return {
    id: row.id,
    userId: row.user_id,
    user: { name: row.user_name, email: row.user_email },
    displayName: row.display_name,
    category: row.category,
    city: row.city,
    skills: JSON.parse(row.skills_json || "[]"),
    hourlyRate: row.hourly_rate,
    experienceYears: row.experience_years,
    bio: row.bio,
    verificationStatus: row.verification_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLocation(row) {
  return {
    id: row.id,
    userId: row.user_id,
    ownerType: row.owner_type,
    user: { name: row.user_name, email: row.user_email },
    label: row.label,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    radiusKm: row.radius_km,
    isPrimary: row.is_primary === 1,
    visibility: row.visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapStorageFile(row) {
  return {
    id: row.id,
    userId: row.user_id,
    ownerType: row.owner_type,
    ownerId: row.owner_id,
    user: { name: row.user_name, email: row.user_email },
    folder: row.folder,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    storageProvider: row.storage_provider,
    bucket: row.bucket,
    objectKey: row.object_key,
    cdnUrl: row.cdn_url,
    accessLevel: row.access_level,
    status: row.status,
    checksum: row.checksum,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function slugifyPath(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/\/+/g, "/")
    .replace(/^-+|-+$/g, "") || "general";
}

function slugifyFileName(value) {
  return String(value)
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "file";
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}
