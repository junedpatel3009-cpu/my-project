import { getApiDatabase } from "@/backend/database.server";

type ReportRole = "ADMIN" | "CLIENT" | "PROFESSIONAL";

export type ReportFilters = {
  period: "ALL" | "TODAY" | "YESTERDAY" | "LAST_7_DAYS" | "LAST_30_DAYS" | "THIS_MONTH" | "LAST_MONTH";
  status?: string | null;
  search?: string | null;
  category?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  paymentMethod?: string | null;
  verificationStatus?: string | null;
  rating?: string | null;
};

export type SummaryCard = {
  label: string;
  value: string;
  hint: string;
  icon: "users" | "jobs" | "wallet" | "review" | "dispute" | "earnings";
};

export type ReportHistoryItem = {
  id: number;
  reportName: string;
  generatedBy: string;
  role: ReportRole;
  generatedAt: string;
  filtersUsed: string;
  fileSize: string;
  downloadCount: number;
};

export type DashboardReportData = {
  role: ReportRole;
  viewerName: string;
  summaryCards: SummaryCard[];
  users: Array<Record<string, unknown>>;
  jobs: Array<Record<string, unknown>>;
  transactions: Array<Record<string, unknown>>;
  withdrawals: Array<Record<string, unknown>>;
  reviews: Array<Record<string, unknown>>;
  disputes: Array<Record<string, unknown>>;
  history: ReportHistoryItem[];
};

export function getViewerReportsData(viewer: { id: number; role: ReportRole; firstName: string; lastName: string; email: string } | null, filters: ReportFilters): DashboardReportData | null {
  if (!viewer) {
    return null;
  }

  const db = getApiDatabase();
  const viewerName = `${viewer.firstName} ${viewer.lastName}`.trim() || viewer.email;

  if (viewer.role === "ADMIN") {
    const users = getUsers(db, filters);
    const jobs = getJobs(db, filters);
    const transactions = getTransactions(db, filters);
    const withdrawals = getWithdrawals(db, filters);
    const reviews = getReviews(db, filters);
    const disputes = getDisputes(db, filters);

    return {
      role: "ADMIN",
      viewerName,
      summaryCards: [
        { label: "Total users", value: String(users.length), hint: "Live accounts", icon: "users" },
        { label: "Jobs", value: String(jobs.length), hint: "Open and closed", icon: "jobs" },
        { label: "Completed payments", value: String(transactions.filter((row) => String(row.status) === "COMPLETED").length), hint: "Successful transactions", icon: "wallet" },
        { label: "Disputes", value: String(disputes.length), hint: "Open review", icon: "dispute" },
        { label: "Reviews", value: String(reviews.length), hint: "Professional feedback", icon: "review" },
        { label: "Earnings", value: formatCurrency(transactions.reduce((sum, row) => sum + Number(row.amount || 0), 0)), hint: "Completed settlements", icon: "earnings" },
      ],
      users,
      jobs,
      transactions,
      withdrawals,
      reviews,
      disputes,
      history: getStoredReportHistory(db, viewer.id, viewer.role),
    };
  }

  if (viewer.role === "CLIENT") {
    const jobs = getJobs(db, filters).filter((row) => Number(row.userId || 0) === viewer.id);
    const transactions = getTransactions(db, filters).filter((row) => Number(row.clientId || 0) === viewer.id);
    const reviews = getReviews(db, filters).filter((row) => Number(row.clientId || 0) === viewer.id);
    return {
      role: "CLIENT",
      viewerName,
      summaryCards: [
        { label: "Jobs posted", value: String(jobs.length), hint: "Your job board", icon: "jobs" },
        { label: "Completed jobs", value: String(jobs.filter((row) => String(row.status) === "CLOSED").length), hint: "Delivered projects", icon: "jobs" },
        { label: "Payments", value: String(transactions.length), hint: "Completed payments", icon: "wallet" },
        { label: "Total spent", value: formatCurrency(transactions.reduce((sum, row) => sum + Number(row.amount || 0), 0)), hint: "Your project spend", icon: "earnings" },
        { label: "Reviews", value: String(reviews.length), hint: "Your feedback", icon: "review" },
      ],
      users: [],
      jobs,
      transactions,
      withdrawals: [],
      reviews,
      disputes: [],
      history: getStoredReportHistory(db, viewer.id, viewer.role),
    };
  }

  const jobs = getJobs(db, filters).filter((row) => Number(row.professionalId || 0) === viewer.id);
  const transactions = getTransactions(db, filters).filter((row) => Number(row.professionalId || 0) === viewer.id);
  const withdrawals = getWithdrawals(db, filters).filter((row) => Number(row.professionalId || 0) === viewer.id);
  const reviews = getReviews(db, filters).filter((row) => Number(row.professionalId || 0) === viewer.id);

  return {
    role: "PROFESSIONAL",
    viewerName,
    summaryCards: [
      { label: "Jobs applied", value: String(jobs.length), hint: "Active work", icon: "jobs" },
      { label: "Jobs completed", value: String(jobs.filter((row) => String(row.status) === "CLOSED").length), hint: "Delivered work", icon: "jobs" },
      { label: "Earnings", value: formatCurrency(transactions.reduce((sum, row) => sum + Number(row.amount || 0), 0)), hint: "Collected earnings", icon: "earnings" },
      { label: "Pending payouts", value: String(withdrawals.filter((row) => String(row.status) !== "COMPLETED" && String(row.status) !== "REJECTED").length), hint: "Awaiting review", icon: "wallet" },
      { label: "Reviews", value: String(reviews.length), hint: "Client feedback", icon: "review" },
    ],
    users: [],
    jobs,
    transactions,
    withdrawals,
    reviews,
    disputes: [],
    history: getStoredReportHistory(db, viewer.id, viewer.role),
  };
}

export async function saveReportExport(input: { ownerId: number; role: ReportRole; reportName: string; filters: ReportFilters; content: string; generatedBy: string }) {
  const [{ mkdirSync, statSync, writeFileSync }, pathModule] = await Promise.all([
    import("node:fs"),
    import("node:path"),
  ]);

  const db = getApiDatabase();
  const storageRoot = pathModule.resolve(process.cwd(), process.env.FILE_STORAGE_PATH || "storage");
  const timestamp = new Date();
  const slug = String(input.reportName || "report")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "report";
  const fileName = `${slug}-${timestamp.getTime()}.html`;
  const storageKey = `reports/${input.role.toLowerCase()}/${input.ownerId}/${fileName}`;
  const targetPath = pathModule.resolve(storageRoot, storageKey);

  mkdirSync(pathModule.dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, input.content, "utf8");

  const stat = statSync(targetPath);
  const result = db
    .prepare(
      `INSERT INTO "StoredFile" (ownerId,purpose,fileName,mimeType,sizeBytes,storageKey,isPublic,createdAt) VALUES (?,?,?,?,?,?,?,?)`,
    )
    .run(
      input.ownerId,
      "report",
      fileName,
      "text/html",
      stat.size,
      storageKey,
      0,
      timestamp.toISOString(),
    );

  return {
    id: Number(result.lastInsertRowid),
    reportName: input.reportName,
    generatedBy: input.generatedBy,
    role: input.role,
    generatedAt: timestamp.toISOString(),
    filtersUsed: describeFilters(input.filters),
    fileSize: formatBytes(stat.size),
    downloadCount: 1,
  } satisfies ReportHistoryItem;
}

function getStoredReportHistory(db: ReturnType<typeof getApiDatabase>, ownerId: number, role: ReportRole) {
  const rows = db
    .prepare(
      `SELECT id, fileName, ownerId, mimeType, sizeBytes, createdAt FROM "StoredFile" WHERE ownerId = ? AND purpose = 'report' ORDER BY createdAt DESC LIMIT 8`,
    )
    .all(ownerId) as Array<{ id: number; fileName: string; sizeBytes: number; createdAt: string }>;

  return rows.map((row) => ({
    id: row.id,
    reportName: row.fileName.replace(/\.html$/i, ""),
    generatedBy: role,
    role,
    generatedAt: row.createdAt,
    filtersUsed: "Live database view",
    fileSize: formatBytes(row.sizeBytes),
    downloadCount: 1,
  }));
}

function getUsers(db: ReturnType<typeof getApiDatabase>, filters: ReportFilters) {
  const rows = db.prepare(`SELECT * FROM "User" ORDER BY datetime(createdAt) DESC`).all() as Array<Record<string, unknown>>;
  return applyFilters(rows, filters, {
    role: "role",
    search: ["firstName", "lastName", "email", "companyName", "professionalCategory"],
    category: "professionalCategory",
    city: "professionalCity",
    state: "address",
    country: "address",
    verificationStatus: "isVerified",
  });
}

function getJobs(db: ReturnType<typeof getApiDatabase>, filters: ReportFilters) {
  const rows = db.prepare(`SELECT * FROM "ClientJob" ORDER BY datetime(createdAt) DESC`).all() as Array<Record<string, unknown>>;
  return applyFilters(rows, filters, {
    status: "status",
    search: ["title", "description", "category", "locationLabel", "locationAddress"],
    category: "category",
    city: "locationLabel",
    state: "locationAddress",
    country: "locationAddress",
  });
}

function getTransactions(db: ReturnType<typeof getApiDatabase>, filters: ReportFilters) {
  const rows = db.prepare(`SELECT * FROM "ProjectTransaction" ORDER BY datetime(createdAt) DESC`).all() as Array<Record<string, unknown>>;
  return applyFilters(rows, filters, {
    status: "status",
    search: ["description", "type"],
    paymentMethod: "type",
  });
}

function getWithdrawals(db: ReturnType<typeof getApiDatabase>, filters: ReportFilters) {
  const rows = db.prepare(`SELECT * FROM "ProjectWithdrawal" ORDER BY datetime(createdAt) DESC`).all() as Array<Record<string, unknown>>;
  return applyFilters(rows, filters, {
    status: "status",
    search: ["destinationLabel", "note"],
  });
}

function getReviews(db: ReturnType<typeof getApiDatabase>, filters: ReportFilters) {
  const rows = db.prepare(`SELECT * FROM "ProjectReview" ORDER BY datetime(createdAt) DESC`).all() as Array<Record<string, unknown>>;
  return applyFilters(rows, filters, {
    search: ["comment"],
    rating: "rating",
  });
}

function getDisputes(db: ReturnType<typeof getApiDatabase>, filters: ReportFilters) {
  const rows = db.prepare(`SELECT * FROM "ProjectDispute" ORDER BY datetime(createdAt) DESC`).all() as Array<Record<string, unknown>>;
  return applyFilters(rows, filters, {
    status: "status",
    search: ["message", "issueType"],
  });
}

function applyFilters<T extends Record<string, unknown>>(rows: T[], filters: ReportFilters, mapping: Record<string, string | string[]>) {
  const period = filters.period || "ALL";
  const search = (filters.search || "").trim().toLowerCase();
  const category = (filters.category || "").trim();
  const city = (filters.city || "").trim();
  const state = (filters.state || "").trim();
  const country = (filters.country || "").trim();
  const paymentMethod = (filters.paymentMethod || "").trim();
  const verificationStatus = (filters.verificationStatus || "").trim();
  const rating = (filters.rating || "").trim();
  const status = (filters.status || "").trim();

  return rows.filter((row) => {
    if (!matchesPeriod(row.createdAt as string | undefined, period)) {
      return false;
    }

    if (status) {
      const value = String(row.status ?? "").toUpperCase();
      if (value !== status.toUpperCase()) return false;
    }

    if (category && !matchesField(row, mapping.category, category)) return false;
    if (city && !matchesField(row, mapping.city, city)) return false;
    if (state && !matchesField(row, mapping.state, state)) return false;
    if (country && !matchesField(row, mapping.country, country)) return false;
    if (paymentMethod && !matchesField(row, mapping.paymentMethod, paymentMethod)) return false;
    if (verificationStatus && !matchesVerification(row, verificationStatus)) return false;
    if (rating && !matchesRating(row, rating)) return false;

    if (!search) return true;
    const fields = mapping.search ?? [];
    return fields.some((field) => String(row[field] ?? "").toLowerCase().includes(search));
  });
}

function matchesField(row: Record<string, unknown>, field: string | string[] | undefined, target: string) {
  if (!field) return false;
  const fields = Array.isArray(field) ? field : [field];
  return fields.some((name) => String(row[name] ?? "").toLowerCase().includes(target.toLowerCase()));
}

function matchesVerification(row: Record<string, unknown>, value: string) {
  const isVerified = Boolean(row.isVerified);
  if (value.toUpperCase() === "VERIFIED") return isVerified;
  if (value.toUpperCase() === "PENDING") return !isVerified;
  return true;
}

function matchesRating(row: Record<string, unknown>, value: string) {
  const numeric = Number(row.rating ?? 0);
  if (value === "5") return numeric >= 5;
  if (value === "4") return numeric >= 4 && numeric < 5;
  if (value === "3") return numeric >= 3 && numeric < 4;
  return numeric >= Number(value);
}

function matchesPeriod(value: string | undefined, period: ReportFilters["period"]) {
  if (!value || period === "ALL") return true;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return true;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  if (period === "TODAY") {
    return date >= startOfToday;
  }
  if (period === "YESTERDAY") {
    const yesterday = new Date(startOfToday);
    yesterday.setDate(yesterday.getDate() - 1);
    return date >= yesterday && date < startOfToday;
  }
  if (period === "LAST_7_DAYS") {
    const threshold = new Date(startOfToday);
    threshold.setDate(threshold.getDate() - 6);
    return date >= threshold;
  }
  if (period === "LAST_30_DAYS") {
    const threshold = new Date(startOfToday);
    threshold.setDate(threshold.getDate() - 29);
    return date >= threshold;
  }
  if (period === "THIS_MONTH") {
    return date >= startOfMonth && date <= endOfMonth;
  }
  if (period === "LAST_MONTH") {
    return date >= startOfLastMonth && date <= endOfLastMonth;
  }
  return true;
}

function describeFilters(filters: ReportFilters) {
  const parts = [filters.period];
  if (filters.status) parts.push(`status:${filters.status}`);
  if (filters.search) parts.push(`search:${filters.search}`);
  if (filters.category) parts.push(`category:${filters.category}`);
  if (filters.city) parts.push(`city:${filters.city}`);
  if (filters.state) parts.push(`state:${filters.state}`);
  if (filters.country) parts.push(`country:${filters.country}`);
  if (filters.paymentMethod) parts.push(`payment:${filters.paymentMethod}`);
  if (filters.verificationStatus) parts.push(`verification:${filters.verificationStatus}`);
  if (filters.rating) parts.push(`rating:${filters.rating}`);
  return parts.join(" • ");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
