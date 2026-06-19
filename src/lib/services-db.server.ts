import path from "node:path";
import Database from "better-sqlite3";

type BetterSqlite3Database = InstanceType<typeof Database>;

export type ServiceCategoryRecord = {
  name: string;
  count: number;
};

const globalForServicesDb = globalThis as typeof globalThis & {
  servicesDb?: BetterSqlite3Database;
};

function getDatabase() {
  if (!globalForServicesDb.servicesDb) {
    const databasePath = path.resolve(process.cwd(), "prisma", "app.db");
    globalForServicesDb.servicesDb = new Database(databasePath);
    ensureServicesTables(globalForServicesDb.servicesDb);
  }
  return globalForServicesDb.servicesDb;
}

function ensureServicesTables(db: BetterSqlite3Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS "ServiceCategory" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL UNIQUE,
      "slug" TEXT NOT NULL UNIQUE,
      "description" TEXT DEFAULT '',
      "iconName" TEXT DEFAULT '',
      "sortOrder" INTEGER DEFAULT 0,
      "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
      "updatedAt" TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT OR IGNORE INTO "ServiceCategory" ("name", "slug", "iconName", "sortOrder") VALUES
      ('Home Services', 'home-services', 'Wrench', 1),
      ('Development', 'development', 'Code', 2),
      ('Design', 'design', 'Paintbrush', 3),
      ('Photography', 'photography', 'Camera', 4),
      ('Marketing', 'marketing', 'Megaphone', 5),
      ('Tutoring', 'tutoring', 'GraduationCap', 6),
      ('Repair', 'repair', 'Hammer', 7),
      ('Cleaning', 'cleaning', 'Sparkles', 8),
      ('Moving', 'moving', 'Truck', 9),
      ('Events', 'events', 'Music', 10),
      ('Business', 'business', 'Briefcase', 11),
      ('Wellness', 'wellness', 'HeartPulse', 12);
  `);
}

export function getServiceCategories() {
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT sc.name, sc.slug, sc.iconName, sc.description, sc.sortOrder,
              (SELECT COUNT(*) FROM "User" WHERE "professionalCategory" = sc.name AND role = 'PROFESSIONAL' AND "isActive" = 1) AS proCount,
              (SELECT COUNT(*) FROM "ClientJob" WHERE "category" = sc.name AND status = 'OPEN') AS jobCount
       FROM "ServiceCategory" sc
       ORDER BY sc.sortOrder ASC`,
    )
    .all() as Array<{
    name: string;
    slug: string;
    iconName: string;
    description: string;
    sortOrder: number;
    proCount: number;
    jobCount: number;
  }>;

  return rows;
}

export function getTotalProfessionalsCount(): number {
  const db = getDatabase();
  const result = db
    .prepare('SELECT COUNT(*) AS count FROM "User" WHERE role = ? AND "isActive" = 1')
    .get("PROFESSIONAL") as { count: number };
  return result.count;
}