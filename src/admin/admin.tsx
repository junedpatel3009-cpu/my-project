import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { createFileRoute, Link, useLoaderData, useRouter } from "@tanstack/react-router";
import type { ComponentType, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarRange,
  ClipboardList,
  DollarSign,
  FileBarChart2,
  ReceiptText,
  Radio,
  Search,
  Settings,
  ShieldCheck,
  TrendingUp,
  UserCog,
  Users,
  Zap,
  Command,
  LayoutTemplate,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GlobalSearchOverlay } from "@/components/GlobalSearch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  getAdminJobRecords,
  getAdminDisputeRecords,
  getAdminPaymentTransactions,
  getAdminDashboardSnapshot,
  updateAdminDisputeStatus,
  type AdminDisputeRecord,
  type AdminJobRecord,
  type AdminDashboardSnapshot,
  type AdminPaymentTransaction,
} from "@/lib/admin-dashboard-db.server";
import { createSessionCookie } from "@/lib/auth-session.server";
import { getCurrentUser } from "@/lib/current-user.server";
import {
  createUserRecord,
  findUserByEmail,
  getAdminUsers,
  getAdminUserStats,
  updateUserPasswordByEmail,
  updateUserActiveStatusByAdmin,
  updateUserRoleByAdmin,
  type AdminUserRecord,
  type AdminUserStats,
  type PublicUser,
  type UserRole,
} from "@/lib/user-db.server";

const ADMIN_USERNAME = "juned";
const ADMIN_EMAIL = "juned@admin.local";
const ADMIN_PASSWORD = "2412";

const getAdminPageData = createServerFn({ method: "GET" }).handler(async () => {
  const viewer = getCurrentUser();

  if (!viewer) {
    return {
      viewer: null,
      users: [],
      stats: null,
      dashboard: null,
      jobRecords: [],
      disputeRecords: [],
      paymentTransactions: [],
    };
  }

  if (viewer.role !== "ADMIN") {
    return {
      viewer,
      users: [],
      stats: null,
      dashboard: null,
      jobRecords: [],
      disputeRecords: [],
      paymentTransactions: [],
    };
  }

  return {
    viewer,
    users: getAdminUsers(),
    stats: getAdminUserStats(),
    dashboard: getAdminDashboardSnapshot(),
    jobRecords: getAdminJobRecords(),
    disputeRecords: getAdminDisputeRecords(),
    paymentTransactions: getAdminPaymentTransactions(),
  };
});

const submitAdminLogin = createServerFn({ method: "POST" })
  .inputValidator((input: { username: string; password: string }) => input)
  .handler(async ({ data }) => {
    const username = data.username.trim().toLowerCase();

    if (username !== ADMIN_USERNAME || data.password !== ADMIN_PASSWORD) {
      return {
        ok: false as const,
        formError: "Invalid admin username or password.",
      };
    }

    const passwordHash = await hashPassword(data.password);
    const existingAdmin = findUserByEmail(ADMIN_EMAIL);
    let adminUser: PublicUser | undefined = existingAdmin;

    if (existingAdmin) {
      if (existingAdmin.role !== "ADMIN") {
        updateUserRoleByAdmin(existingAdmin.id, "ADMIN");
      }

      updateUserActiveStatusByAdmin(existingAdmin.id, true);
      updateUserPasswordByEmail(ADMIN_EMAIL, passwordHash);
      adminUser = findUserByEmail(ADMIN_EMAIL);
    } else {
      adminUser = createUserRecord({
        role: "ADMIN",
        firstName: "Juned",
        lastName: "Admin",
        email: ADMIN_EMAIL,
        phone: null,
        passwordHash,
        authProvider: "LOCAL",
      });
    }

    if (!adminUser) {
      return {
        ok: false as const,
        formError: "Could not prepare admin account.",
      };
    }

    setResponseHeader(
      "Set-Cookie",
      createSessionCookie({
        id: adminUser.id,
        role: "ADMIN",
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        email: adminUser.email,
        phone: adminUser.phone,
        avatarUrl: adminUser.avatarUrl,
        authProvider: adminUser.authProvider,
      }),
    );

    return {
      ok: true as const,
    };
  });

const updateManagedUserRole = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: number; role: UserRole }) => input)
  .handler(async ({ data }) => {
    const viewer = getCurrentUser();

    if (!viewer || viewer.role !== "ADMIN") {
      throw new Error("Only admins can change user roles.");
    }

    if (viewer.id === data.userId && data.role !== "ADMIN") {
      throw new Error("You cannot remove your own admin role.");
    }

    return updateUserRoleByAdmin(data.userId, data.role);
  });

const updateManagedUserStatus = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: number; isActive: boolean }) => input)
  .handler(async ({ data }) => {
    const viewer = getCurrentUser();

    if (!viewer || viewer.role !== "ADMIN") {
      throw new Error("Only admins can change user status.");
    }

    if (viewer.id === data.userId && !data.isActive) {
      throw new Error("You cannot deactivate your own admin account.");
    }

    return updateUserActiveStatusByAdmin(data.userId, data.isActive);
  });

const updateManagedDisputeStatus = createServerFn({ method: "POST" })
  .inputValidator((input: { disputeId: number; status: "OPEN" | "UNDER_REVIEW" | "RESOLVED" }) => input)
  .handler(async ({ data }) => {
    const viewer = getCurrentUser();

    if (!viewer || viewer.role !== "ADMIN") {
      throw new Error("Only admins can update disputes.");
    }

    return updateAdminDisputeStatus(data.disputeId, data.status);
  });

export const Route = createFileRoute("/admin")({
  loader: () => getAdminPageData(),
  head: () => ({ meta: [{ title: "Admin - Servio" }] }),
  component: Admin,
});

type ShortcutKey = "overview" | "jobs" | "users" | "payments";

const shortcutConfig = [
  { key: "overview", label: "Overview", icon: TrendingUp, description: "Live platform metrics" },
  { key: "jobs", label: "Jobs & Disputes", icon: BriefcaseBusiness, description: "Job posts, tracked work, and dispute queue" },
  { key: "users", label: "Users", icon: Users, description: "User roles and access" },
  { key: "payments", label: "Payments", icon: ReceiptText, description: "Revenue and payouts" },
] as const;

const tabs = shortcutConfig;

const roleOptions = [
  { value: "ADMIN", label: "Admin" },
  { value: "CLIENT", label: "Client" },
  { value: "PROFESSIONAL", label: "Professional" },
] as const;

function Admin() {
  const data = useLoaderData({ from: "/admin" });
  const router = useRouter();
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("overview");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [liveStatus, setLiveStatus] = useState("Connecting live feed...");
  const [jobQuery, setJobQuery] = useState("");
  const [disputeQuery, setDisputeQuery] = useState("");
  const [paymentQuery, setPaymentQuery] = useState("");

  useEffect(() => {
    const handleShortcutKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && /^\d$/.test(event.key)) {
        const index = Number(event.key) - 1;

        if (index >= 0 && index < tabs.length) {
          event.preventDefault();
          setTab(tabs[index].key);
        }
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleShortcutKeyDown);

    return () => {
      window.removeEventListener("keydown", handleShortcutKeyDown);
    };
  }, []);

  const filteredJobs = useMemo(() => {
    const term = jobQuery.trim().toLowerCase();
    const jobs = data.jobRecords as JobRecord[];

    if (!term) {
      return jobs;
    }

    return jobs.filter((job) => {
      const haystack = [
        job.title,
        job.category,
        job.status,
        job.clientName,
        job.clientEmail,
        job.professionalName,
        job.professionalEmail,
        job.trackingStatus,
        job.locationLabel,
        job.locationAddress,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [data.jobRecords, jobQuery]);

  const filteredDisputes = useMemo(() => {
    const term = disputeQuery.trim().toLowerCase();
    const disputes = data.disputeRecords as DisputeRecord[];

    if (!term) {
      return disputes;
    }

    return disputes.filter((dispute) => {
      const haystack = [
        dispute.jobTitle,
        dispute.issueType,
        dispute.priority,
        dispute.status,
        dispute.message,
        dispute.reporterRole,
        dispute.reporterName,
        dispute.reporterEmail,
        dispute.clientName,
        dispute.clientEmail,
        dispute.professionalName,
        dispute.professionalEmail,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [data.disputeRecords, disputeQuery]);

  const filteredPayments = useMemo(() => {
    const term = paymentQuery.trim().toLowerCase();
    const payments = data.paymentTransactions as PaymentRecord[];

    if (!term) {
      return payments;
    }

    return payments.filter((payment) => {
      const haystack = [
        payment.jobTitle,
        payment.clientName,
        payment.clientEmail,
        payment.professionalName,
        payment.professionalEmail,
        payment.status,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [data.paymentTransactions, paymentQuery]);

  useEffect(() => {
    if (!data?.viewer || data.viewer.role !== "ADMIN") {
      return;
    }

    const socket = io(getSocketUrl(), {
      auth: {
        userId: data.viewer.id,
        role: data.viewer.role,
        name: `${data.viewer.firstName} ${data.viewer.lastName}`.trim() || data.viewer.email,
        avatarUrl: data.viewer.avatarUrl,
      },
    });

    const refresh = async (reason: string) => {
      setLiveStatus(`Live update: ${reason}`);
      await router.invalidate();
    };

    socket.emit("admin:subscribe");
    socket.on("connect", () => setLiveStatus("Live feed connected"));
    socket.on("disconnect", () => setLiveStatus("Live feed disconnected"));
    socket.on("admin:refresh", (payload: { reason?: string }) => {
      refresh(payload?.reason || "platform activity");
    });
    socket.on("project:activity", () => {
      refresh("project activity");
    });
    socket.on("notifications:refresh", (payload: { reason?: string }) => {
      refresh(payload?.reason || "notification activity");
    });

    return () => {
      socket.disconnect();
    };
  }, [data?.viewer, router]);

  if (!data?.viewer || data.viewer.role !== "ADMIN" || !data.stats || !data.dashboard) {
    return <AdminLogin />;
  }

  const displayName =
    `${data.viewer.firstName} ${data.viewer.lastName}`.trim() || data.viewer.email;
  const users = data.users as AdminUserRecord[];
  const shortcutStats = getShortcutStats(data.dashboard, data.stats, users.length);
  const activeShortcut = shortcutConfig.find((item) => item.key === tab) ?? shortcutConfig[0];
  const filteredUsers = users.filter((user) => {
    const haystack = `${user.firstName} ${user.lastName} ${user.email} ${user.role}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  return (
    <AppShell userName={displayName} userRole="Admin" userAvatarUrl={data.viewer.avatarUrl}>
      <GlobalSearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

      <div className="mb-6 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin panel</h1>
          <p className="text-sm text-muted-foreground">
            Live view of users, client job posts, transactions, projects, and review queues.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Global search</span>
            <kbd className="hidden items-center gap-1 rounded border border-border bg-muted/50 px-1.5 py-0.5 text-xs md:inline-flex">
              <Command className="h-3 w-3" />
              K
            </kbd>
          </Button>
          <Badge variant="secondary" className="w-fit gap-2">
            <ShieldCheck className="h-4 w-4" />
            Admin session
          </Badge>
          <Badge variant="outline" className="w-fit gap-2">
            <Radio className="h-4 w-4" />
            {liveStatus}
          </Badge>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-soft">
        <div className="border-b border-border p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-primary">Shortcuts</p>
              <h2 className="mt-1 text-lg font-semibold">Dashboard shortcuts</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick a shortcut to load its summary cards instantly. Ctrl/Cmd + 1–9 also works.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <Zap className="h-3.5 w-3.5" />
              Admin shortcuts
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {tabs.map((item) => {
              const Icon = item.icon;
              const isActive = item.key === tab;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/40 text-foreground hover:border-primary/40 hover:bg-primary/5"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={tab === "users" ? "Search users..." : "Search..."}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/web-editor">
                <LayoutTemplate className="mr-2 h-4 w-4" />
                Web Editor
              </Link>
            </Button>
          </div>
        </div>

        <div className="p-4">
          {tab === "overview" && <Overview dashboard={data.dashboard} onSelectTab={setTab} />}
          {tab === "users" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-4">
                <div>
                  <h2 className="font-semibold">User Management</h2>
                  <p className="text-sm text-muted-foreground">
                    Open the dedicated Clients & Professionals management page.
                  </p>
                </div>
                <Button asChild>
                  <Link to="/user-management">Open user management</Link>
                </Button>
              </div>
              <UsersTable users={filteredUsers} currentUserId={data.viewer.id} />
            </div>
          )}
          {tab === "jobs" && (
            <ShortcutPanel
              key={tab}
              shortcut={activeShortcut}
              stats={shortcutStats[activeShortcut.key]}
            >
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background p-4">
                <div>
                  <h3 className="font-semibold">Job & Dispute Management</h3>
                  <p className="text-sm text-muted-foreground">
                    Open the dedicated admin page for job records and dispute resolution.
                  </p>
                </div>
                <Button asChild>
                  <Link to="/job-management">Open job management</Link>
                </Button>
              </div>
              <JobDisputeManagement
                jobs={filteredJobs}
                disputes={filteredDisputes}
                jobQuery={jobQuery}
                disputeQuery={disputeQuery}
                onJobQueryChange={setJobQuery}
                onDisputeQueryChange={setDisputeQuery}
              />
            </ShortcutPanel>
          )}
          {tab === "payments" && (
            <ShortcutPanel
              key={tab}
              shortcut={activeShortcut}
              stats={shortcutStats[activeShortcut.key]}
            >
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background p-4">
                <div>
                  <h3 className="font-semibold">Earnings, Commission & Payout Reports</h3>
                  <p className="text-sm text-muted-foreground">
                    Open the complete admin report for gross earnings, commission, net payouts, and withdrawal requests.
                  </p>
                </div>
                <Button asChild>
                  <Link to="/earnings-reports">Open earnings reports</Link>
                </Button>
              </div>
              <PaymentsTable
                payments={filteredPayments}
                loading={false}
                query={paymentQuery}
                onQueryChange={setPaymentQuery}
              />
            </ShortcutPanel>
          )}
        </div>
      </div>
    </AppShell>
  );
}

type JobRecord = AdminJobRecord;
type DisputeRecord = AdminDisputeRecord;
type PaymentRecord = AdminPaymentTransaction;

type ShortcutMetric = {
  label: string;
  value: number | string;
  caption: string;
};

function getShortcutStats(
  dashboard: AdminDashboardSnapshot,
  stats: AdminUserStats | null,
  totalUsers: number,
) {
  const totalJobs = dashboard.stats.totalJobs;
  const openJobs = dashboard.stats.openJobs;
  const todayJobs = dashboard.stats.todayJobs;
  const completedJobs = totalJobs - openJobs - todayJobs;
  const totalRevenue = dashboard.stats.totalRevenue || 0;
  const activeUsersCount = stats?.activeUsers ?? totalUsers;

  return {
    overview: [
      { label: "Total users", value: stats?.totalUsers ?? 0, caption: "Registered accounts" },
      { label: "Active users", value: activeUsersCount, caption: "Currently active" },
      {
        label: "Today revenue",
        value: formatMoney(dashboard.stats.todayRevenue),
        caption: "Payments completed today",
      },
      { label: "Open disputes", value: dashboard.stats.openDisputes, caption: "Needs attention" },
    ],
    jobs: [
      { label: "Total jobs", value: totalJobs, caption: "All posted jobs" },
      { label: "Active jobs", value: openJobs, caption: "Running and open work" },
      { label: "Completed jobs", value: completedJobs, caption: "Closed successfully" },
      { label: "Open disputes", value: dashboard.stats.openDisputes, caption: "Needs admin review" },
    ],
    users: [
      {
        label: "Total users",
        value: stats?.totalUsers ?? totalUsers,
        caption: "All account holders",
      },
      { label: "Active users", value: activeUsersCount, caption: "Verified and active" },
      {
        label: "New today",
        value: dashboard.stats.todayUsers,
        caption: "Accounts created today",
      },
      {
        label: "Verified users",
        value: stats?.activeUsers ?? 0,
        caption: "Verified from current database counts",
      },
    ],
    payments: [
      { label: "Total revenue", value: formatMoney(totalRevenue), caption: "Completed earnings" },
      {
        label: "Successful payments",
        value: dashboard.stats.todayTransactions,
        caption: "Transactions completed",
      },
      {
        label: "Monthly revenue",
        value: formatMoney(dashboard.stats.todayRevenue * 30),
        caption: "Derived from current database revenue",
      },
    ],
  } satisfies Record<ShortcutKey, ShortcutMetric[]>;
}

function ShortcutPanel({
  shortcut,
  stats,
  children,
}: {
  shortcut: (typeof tabs)[number];
  stats: ShortcutMetric[];
  children?: React.ReactNode;
}) {
  const Icon = shortcut.icon;

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-primary">{shortcut.label}</p>
          <h2 className="mt-1 text-xl font-semibold">{shortcut.label} dashboard</h2>
          <p className="mt-1 text-sm text-muted-foreground">{shortcut.description}</p>
        </div>
        <div className="rounded-full border border-border bg-background p-3">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <div
            key={`${shortcut.key}-${item.label}`}
            className="rounded-lg border border-border bg-background p-4"
          >
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-2 text-2xl font-semibold">{item.value}</p>
            <p className="text-xs text-muted-foreground">{item.caption}</p>
          </div>
        ))}
      </div>

      {children}
    </div>
  );
}

function JobDisputeManagement({
  jobs,
  disputes,
  jobQuery,
  disputeQuery,
  onJobQueryChange,
  onDisputeQueryChange,
}: {
  jobs: JobRecord[];
  disputes: DisputeRecord[];
  jobQuery: string;
  disputeQuery: string;
  onJobQueryChange: (value: string) => void;
  onDisputeQueryChange: (value: string) => void;
}) {
  const openDisputes = disputes.filter((dispute) => dispute.status !== "RESOLVED").length;
  const highPriorityDisputes = disputes.filter((dispute) => dispute.priority === "HIGH" && dispute.status !== "RESOLVED").length;

  return (
    <div className="mt-5 space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-background p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Work queue</p>
          <p className="mt-2 text-2xl font-semibold">{jobs.length}</p>
          <p className="text-xs text-muted-foreground">Jobs matching the current filter</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Open disputes</p>
          <p className="mt-2 text-2xl font-semibold">{openDisputes}</p>
          <p className="text-xs text-muted-foreground">Open or under review</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">High priority</p>
          <p className="mt-2 text-2xl font-semibold">{highPriorityDisputes}</p>
          <p className="text-xs text-muted-foreground">Needs faster admin response</p>
        </div>
      </div>

      <DisputesTable disputes={disputes} query={disputeQuery} onQueryChange={onDisputeQueryChange} />
      <JobsTable jobs={jobs} query={jobQuery} onQueryChange={onJobQueryChange} />
    </div>
  );
}

function DisputesTable({
  disputes,
  query,
  onQueryChange,
}: {
  disputes: DisputeRecord[];
  query: string;
  onQueryChange: (value: string) => void;
}) {
  const router = useRouter();
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  async function handleStatusChange(disputeId: number, status: DisputeRecord["status"]) {
    if (!["OPEN", "UNDER_REVIEW", "RESOLVED"].includes(status)) {
      return;
    }

    setUpdatingId(disputeId);

    try {
      await updateManagedDisputeStatus({
        data: { disputeId, status: status as "OPEN" | "UNDER_REVIEW" | "RESOLVED" },
      });
      await router.invalidate();
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Dispute management</h3>
          <p className="text-sm text-muted-foreground">
            Review reported issues, identify the related job, and update the admin resolution state.
          </p>
        </div>
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search disputes..."
          className="w-full max-w-xs"
        />
      </div>

      {disputes.length ? (
        <div className="divide-y divide-border rounded-lg border border-border">
          {disputes.map((dispute) => (
            <div
              key={dispute.id}
              className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold">{dispute.jobTitle}</p>
                  <Badge variant={dispute.status === "OPEN" ? "destructive" : dispute.status === "UNDER_REVIEW" ? "secondary" : "outline"}>
                    {formatEnum(dispute.status)}
                  </Badge>
                  <Badge variant={dispute.priority === "HIGH" ? "destructive" : "outline"}>
                    {formatEnum(dispute.priority)}
                  </Badge>
                  <Badge variant="outline">{formatEnum(dispute.issueType)}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Reported by {formatEnum(dispute.reporterRole)}:{" "}
                  <span className="font-medium text-foreground">{dispute.reporterName}</span> /{" "}
                  {formatDateTime(dispute.createdAt)}
                </p>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{dispute.message}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Client: <span className="font-medium text-foreground">{dispute.clientName}</span>
                  {" / "}
                  Professional: <span className="font-medium text-foreground">{dispute.professionalName}</span>
                </p>
              </div>
              <div className="space-y-2">
                <Select
                  value={dispute.status}
                  onValueChange={(value) => handleStatusChange(dispute.id, value)}
                  disabled={updatingId === dispute.id}
                >
                  <SelectTrigger aria-label={`Update dispute ${dispute.id} status`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="UNDER_REVIEW">Under review</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Updated {formatDateTime(dispute.updatedAt)}
                </p>
                {dispute.jobId ? (
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link to="/project/$projectId" params={{ projectId: String(dispute.jobId) }}>
                      Open job
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No disputes found in the database.
        </div>
      )}
    </div>
  );
}

function JobsTable({
  jobs,
  query,
  onQueryChange,
}: {
  jobs: JobRecord[];
  query: string;
  onQueryChange: (value: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Database client jobs</h3>
          <p className="text-sm text-muted-foreground">
            Real job records from the admin database. Search by client, title, category, location,
            or status.
          </p>
        </div>
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search jobs..."
          className="w-full max-w-xs"
        />
      </div>

      {jobs.length ? (
        <div className="divide-y divide-border rounded-lg border border-border">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold">{job.title}</p>
                  <Badge variant={job.status === "OPEN" ? "default" : "outline"}>
                    {formatEnum(job.status)}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {job.category} / Posted {formatDateTime(job.createdAt)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Client: <span className="font-medium text-foreground">{job.clientName}</span>
                  {job.professionalName ? (
                    <>
                      {" / "}
                      Professional:{" "}
                      <span className="font-medium text-foreground">{job.professionalName}</span>
                    </>
                  ) : null}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatEnum(job.workMode)} / Deadline {formatDate(job.deadline)}
                  {job.locationLabel ? ` / ${job.locationLabel}` : ""}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Posted: {formatDateTime(job.createdAt)}
                  {job.acceptedAt ? ` / Accepted: ${formatDateTime(job.acceptedAt)}` : ""}
                  {job.completionSubmittedAt
                    ? ` / Submitted: ${formatDateTime(job.completionSubmittedAt)}`
                    : ""}
                  {job.completedAt ? ` / Completed: ${formatDateTime(job.completedAt)}` : ""}
                </p>
              </div>
              <p className="shrink-0 text-lg font-semibold">
                {formatBudget(job.budgetMin, job.budgetMax)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No client jobs found in the database.
        </div>
      )}
    </div>
  );
}

function PaymentsTable({
  payments,
  loading,
  query,
  onQueryChange,
}: {
  payments: PaymentRecord[];
  loading: boolean;
  query: string;
  onQueryChange: (value: string) => void;
}) {
  return (
    <div className="mt-5 rounded-xl border border-border bg-background p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Database payment transactions</h3>
          <p className="text-sm text-muted-foreground">
            Real payment records from the admin database. Search by professional, client, job, or
            status.
          </p>
        </div>
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search payments..."
          className="w-full max-w-xs"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-4 w-1/3 animate-pulse rounded bg-primary/10" />
          <div className="h-12 animate-pulse rounded bg-primary/10" />
          <div className="h-12 animate-pulse rounded bg-primary/10" />
        </div>
      ) : payments.length ? (
        <div className="divide-y divide-border rounded-lg border border-border">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {formatEnum(payment.paymentType)} - {payment.jobTitle}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatEnum(payment.paymentType)} / {formatDateTime(payment.dateTime)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Client: <span className="font-medium text-foreground">{payment.clientName}</span>
                  {" / "}
                  Professional:{" "}
                  <span className="font-medium text-foreground">{payment.professionalName}</span>
                </p>
              </div>
              <p className="shrink-0 text-lg font-semibold">{formatMoney(payment.amount)}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No payment transactions found in the database.
        </div>
      )}
    </div>
  );
}

function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState(ADMIN_USERNAME);
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const result = await submitAdminLogin({ data: { username, password } });

      if (!result.ok) {
        setFormError(result.formError);
        return;
      }

      await router.invalidate();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Admin login failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-muted/30 px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-soft">
        <div className="mb-6">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Admin login</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in with the separate admin account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium" htmlFor="admin-username">
              Username
            </label>
            <Input
              id="admin-username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              className="mt-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="admin-password">
              Password
            </label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="mt-2"
            />
          </div>

          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Opening admin" : "Open admin"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function Overview({
  dashboard,
  onSelectTab,
}: {
  dashboard: AdminDashboardSnapshot;
  onSelectTab: (tab: ShortcutKey) => void;
}) {
  const stats = dashboard.stats;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Users}
          label="Total users"
          value={stats.totalUsers}
          caption={`${stats.activeUsers} active / ${stats.todayUsers} joined today`}
          onClick={() => onSelectTab("users")}
        />
        <MetricCard
          icon={ClipboardList}
          label="Jobs posted today"
          value={stats.todayJobs}
          caption={`${stats.openJobs} open / ${stats.totalJobs} total jobs`}
          onClick={() => onSelectTab("jobs")}
        />
        <MetricCard
          icon={DollarSign}
          label="Today transactions"
          value={formatMoney(stats.todayRevenue)}
          caption={`${stats.todayTransactions} completed payments`}
          onClick={() => onSelectTab("payments")}
        />
        <MetricCard
          icon={AlertTriangle}
          label="Open disputes"
          value={stats.openDisputes}
          caption={`${stats.pendingRequests} pending project requests`}
          onClick={() => onSelectTab("jobs")}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-lg border border-border">
          <div className="border-b border-border p-4">
            <h2 className="font-semibold">Live client job posts</h2>
            <p className="text-sm text-muted-foreground">
              Newest work clients are posting on the website.
            </p>
          </div>
          <div className="divide-y divide-border">
            {dashboard.recentJobs.length ? (
              dashboard.recentJobs.map((job) => (
                <div key={job.id} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{job.title}</p>
                      <Badge variant={job.status === "OPEN" ? "default" : "outline"}>
                        {formatEnum(job.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {job.clientName || "Client"} / {job.category} /{" "}
                      {formatDateTime(job.createdAt)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">
                    {formatBudget(job.budgetMin, job.budgetMax)}
                  </p>
                </div>
              ))
            ) : (
              <EmptyLiveRow
                title="No jobs yet"
                description="Client job posts will appear here as soon as they are created."
              />
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border">
          <div className="border-b border-border p-4">
            <h2 className="font-semibold">Transactions</h2>
            <p className="text-sm text-muted-foreground">
              {formatMoney(stats.totalRevenue)} total completed revenue.
            </p>
          </div>
          <div className="divide-y divide-border">
            {dashboard.recentTransactions.length ? (
              dashboard.recentTransactions.map((transaction) => (
                <div key={transaction.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{transaction.projectTitle}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatEnum(transaction.type)} / {formatDateTime(transaction.createdAt)}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold">{formatMoney(transaction.amount)}</p>
                  </div>
                </div>
              ))
            ) : (
              <EmptyLiveRow
                title="No transactions yet"
                description="Completed project payments will appear here."
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  caption,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  caption: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-lg border border-border bg-card p-5 text-left shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-4 text-sm text-muted-foreground transition-colors group-hover:text-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="text-xs text-muted-foreground">{caption}</p>
    </button>
  );
}

function EmptyLiveRow({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-6 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function UsersTable({ users, currentUserId }: { users: AdminUserRecord[]; currentUserId: number }) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const visibleUsers = useMemo(() => users, [users]);

  async function handleRoleChange(user: AdminUserRecord, role: UserRole) {
    const actionKey = `role-${user.id}`;
    setPendingAction(actionKey);

    try {
      await updateManagedUserRole({ data: { userId: user.id, role } });
      await router.invalidate();
    } finally {
      setPendingAction(null);
    }
  }

  async function handleStatusChange(user: AdminUserRecord, isActive: boolean) {
    const actionKey = `status-${user.id}`;
    setPendingAction(actionKey);

    try {
      await updateManagedUserStatus({ data: { userId: user.id, isActive } });
      await router.invalidate();
    } finally {
      setPendingAction(null);
    }
  }

  if (!visibleUsers.length) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <UserCog className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 font-medium">No users found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Try a different name, email, or role search.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <th className="py-3 pr-4 font-medium">User</th>
            <th className="py-3 pr-4 font-medium">Role</th>
            <th className="py-3 pr-4 font-medium">Status</th>
            <th className="py-3 pr-4 font-medium">Provider</th>
            <th className="py-3 pr-4 font-medium">Joined</th>
          </tr>
        </thead>
        <tbody>
          {visibleUsers.map((user) => {
            const isCurrentUser = user.id === currentUserId;
            const fullName = `${user.firstName} ${user.lastName}`.trim() || user.email;

            return (
              <tr
                key={user.id}
                className="border-b border-border/60 last:border-0 hover:bg-muted/40"
              >
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={user.avatarUrl || `https://i.pravatar.cc/100?u=${user.id}`}
                      className="h-9 w-9 rounded-full object-cover"
                      alt=""
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{fullName}</p>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="w-48 py-3 pr-4">
                  <Select
                    value={user.role}
                    onValueChange={(value) => handleRoleChange(user, value as UserRole)}
                    disabled={pendingAction !== null || isCurrentUser}
                  >
                    <SelectTrigger aria-label={`Change ${fullName} role`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={user.isActive}
                      onCheckedChange={(checked) => handleStatusChange(user, checked)}
                      disabled={pendingAction !== null || isCurrentUser}
                      aria-label={`${user.isActive ? "Deactivate" : "Activate"} ${fullName}`}
                    />
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${user.isActive ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"}`}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <Badge variant="outline">{formatEnum(user.authProvider)}</Badge>
                </td>
                <td className="py-3 pr-4 text-muted-foreground">{formatDate(user.createdAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({ label, value, caption }: { label: string; value: number; caption: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">{caption}</p>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatMoney(value: number | null) {
  if (!value) {
    return "$0";
  }

  return `$${value.toLocaleString()}`;
}

function formatBudget(min: number | null, max: number | null) {
  if (min && max) {
    return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
  }

  if (max) {
    return `Up to $${max.toLocaleString()}`;
  }

  if (min) {
    return `From $${min.toLocaleString()}`;
  }

  return "Budget not set";
}

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getSocketUrl() {
  return (
    import.meta.env.VITE_SOCKET_URL ||
    `${window.location.protocol}//${window.location.hostname}:4001`
  );
}

async function hashPassword(password: string) {
  const passwordBuffer = new TextEncoder().encode(password);
  const passwordDigest = await crypto.subtle.digest("SHA-256", passwordBuffer);

  return Array.from(new Uint8Array(passwordDigest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}
