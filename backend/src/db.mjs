import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { config } from "./config.mjs";
import { hashPassword, nowIso } from "./utils.mjs";

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

export const db = new Database(config.dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL CHECK(role IN ('ADMIN', 'CLIENT', 'PROFESSIONAL')),
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      company_name TEXT NOT NULL,
      contact_name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      industry TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS professionals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      category TEXT NOT NULL,
      city TEXT NOT NULL,
      skills_json TEXT NOT NULL DEFAULT '[]',
      hourly_rate INTEGER,
      experience_years INTEGER,
      bio TEXT,
      verification_status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK(verification_status IN ('PENDING', 'APPROVED', 'REJECTED')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      owner_type TEXT NOT NULL CHECK(owner_type IN ('CLIENT', 'PROFESSIONAL')),
      label TEXT NOT NULL,
      address TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      radius_km INTEGER,
      is_primary INTEGER NOT NULL DEFAULT 0,
      visibility TEXT NOT NULL DEFAULT 'PRIVATE' CHECK(visibility IN ('PRIVATE', 'PUBLIC')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS storage_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      owner_type TEXT NOT NULL CHECK(owner_type IN ('CLIENT', 'PROFESSIONAL')),
      owner_id INTEGER,
      folder TEXT NOT NULL DEFAULT 'general',
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      storage_provider TEXT NOT NULL DEFAULT 'LOCAL_S3_SIMULATOR',
      bucket TEXT NOT NULL DEFAULT 'skill-shine-local',
      object_key TEXT NOT NULL UNIQUE,
      cdn_url TEXT NOT NULL,
      access_level TEXT NOT NULL DEFAULT 'PRIVATE' CHECK(access_level IN ('PRIVATE', 'PUBLIC')),
      status TEXT NOT NULL DEFAULT 'READY' CHECK(status IN ('PENDING', 'READY', 'ARCHIVED')),
      checksum TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS clients_user_id_idx ON clients(user_id);
    CREATE INDEX IF NOT EXISTS professionals_user_id_idx ON professionals(user_id);
    CREATE INDEX IF NOT EXISTS professionals_category_idx ON professionals(category);
    CREATE INDEX IF NOT EXISTS professionals_city_idx ON professionals(city);
    CREATE INDEX IF NOT EXISTS locations_user_id_idx ON locations(user_id);
    CREATE INDEX IF NOT EXISTS locations_owner_type_idx ON locations(owner_type);
    CREATE INDEX IF NOT EXISTS locations_visibility_idx ON locations(visibility);
    CREATE INDEX IF NOT EXISTS storage_files_user_id_idx ON storage_files(user_id);
    CREATE INDEX IF NOT EXISTS storage_files_owner_type_idx ON storage_files(owner_type);
    CREATE INDEX IF NOT EXISTS storage_files_access_level_idx ON storage_files(access_level);
    CREATE INDEX IF NOT EXISTS storage_files_status_idx ON storage_files(status);
  `);
}

export function seedAdminIfMissing() {
  const existing = db.prepare("SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1").get();
  const timestamp = nowIso();
  const passwordHash = hashPassword("admin12345");

  if (existing) {
    db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").run(
      passwordHash,
      timestamp,
      existing.id,
    );
    return;
  }

  db.prepare(`
    INSERT INTO users (role, name, email, password_hash, created_at, updated_at)
    VALUES ('ADMIN', 'Admin User', 'admin@example.com', ?, ?, ?)
  `).run(passwordHash, timestamp, timestamp);
}

export function getDatabaseStatus() {
  const tables = getTableNames();

  const counts = Object.fromEntries(
    tables.map((tableName) => {
      const row = db.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get();
      return [tableName, row.count];
    }),
  );

  return {
    connected: true,
    type: "sqlite",
    path: config.dbPath,
    tables,
    counts,
  };
}

export function getDatabaseOverview() {
  const tables = getTableNames();

  return {
    connected: true,
    type: "sqlite",
    path: config.dbPath,
    journalMode: db.pragma("journal_mode", { simple: true }),
    foreignKeys: db.pragma("foreign_keys", { simple: true }) === 1,
    tables: tables.map((tableName) => ({
      name: tableName,
      rowCount: db.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get().count,
      columns: db.prepare(`PRAGMA table_info(${tableName})`).all().map((column) => ({
        name: column.name,
        type: column.type,
        required: column.notnull === 1,
        primaryKey: column.pk === 1,
        defaultValue: column.dflt_value,
      })),
      indexes: db.prepare(`PRAGMA index_list(${tableName})`).all().map((index) => ({
        name: index.name,
        unique: index.unique === 1,
        origin: index.origin,
      })),
      foreignKeys: db.prepare(`PRAGMA foreign_key_list(${tableName})`).all().map((key) => ({
        from: key.from,
        table: key.table,
        to: key.to,
        onUpdate: key.on_update,
        onDelete: key.on_delete,
      })),
      sampleRows: getTableRows(tableName, 5),
    })),
  };
}

export function getTableData(tableName, limit = 50) {
  const tables = getTableNames();
  if (!tables.includes(tableName)) {
    return null;
  }

  return {
    table: tableName,
    rowCount: db.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get().count,
    rows: getTableRows(tableName, limit),
  };
}

function getTableNames() {
  return db
    .prepare(
      `
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `,
    )
    .all()
    .map((row) => row.name);
}

function getTableRows(tableName, limit) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  return db
    .prepare(`SELECT * FROM ${tableName} ORDER BY rowid DESC LIMIT ?`)
    .all(safeLimit)
    .map(maskSensitiveRow);
}

function maskSensitiveRow(row) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes("password") || lowerKey.includes("secret") || lowerKey.includes("token")) {
        return [key, value ? "[hidden]" : value];
      }
      return [key, value];
    }),
  );
}

migrate();
seedAdminIfMissing();
