import { createServerFn } from "@tanstack/react-start";
import { createFileRoute, Link, redirect, useLoaderData } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  Briefcase,
  CalendarRange,
  ClipboardList,
  FileText,
  Globe,
  ReceiptText,
  ShieldCheck,
  TrendingUp,
  User,
  Users,
  Wallet,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCurrentUser } from "@/lib/current-user.server";
import { getClientJobsByUserId } from "@/lib/job-db.server";
import {
  getAdminDashboardSnapshot,
  getAdminEarningsReport,
  type AdminDashboardSnapshot,
  type AdminEarningsReport,
} from "@/lib/admin-dashboard-db.server";
import { getProfessionalProfileByUserId, getClientProfileByUserId } from "@/lib/user-db.server";
import {
  getProfessionalWithdrawals,
  getUserProjectTransactions,
  type ProjectTransactionRecord,
  type ProjectWithdrawalRecord,
} from "@/lib/project-request-db.server";

type ReportPeriod = "ALL" | "30_DAYS" | "90_DAYS" | "THIS_YEAR";

type ReportsLoaderData =
  | {
      viewer: {
        id: number;
        role: "ADMIN" | "CLIENT" | "PROFESSIONAL";
        firstName: string;
        lastName: string;
        email: string;
        avatarUrl?: string | null;
      };
      adminSnapshot: AdminDashboardSnapshot;
      adminEarningsReport: AdminEarningsReport;
      clientProfile: null;
      professionalProfile: null;
      clientJobs: [];
      transactions: ProjectTransactionRecord[];
      withdrawals: ProjectWithdrawalRecord[];
    }
  | {
      viewer: {
        id: number;
        role: "CLIENT";
        firstName: string;
        lastName: string;
        email: string;
        avatarUrl?: string | null;
      };
      clientProfile: ReturnType<typeof getClientProfileByUserId>;
      clientJobs: Awaited<ReturnType<typeof getClientJobsByUserId>>;
      transactions: ProjectTransactionRecord[];
      withdrawals: [];
      adminSnapshot: null;
      adminEarningsReport: null;
      professionalProfile: null;
    }
  | {
      viewer: {
        id: number;
        role: "PROFESSIONAL";
        firstName: string;
        lastName: string;
        email: string;
        avatarUrl?: string | null;
      };
      professionalProfile: ReturnType<typeof getProfessionalProfileByUserId>;
      clientJobs: [];
      clientProfile: null;
      transactions: ProjectTransactionRecord[];
      withdrawals: ProjectWithdrawalRecord[];
      adminSnapshot: null;
      adminEarningsReport: null;
    }
  | {
      viewer: null;
      adminSnapshot: null;
      adminEarningsReport: null;
      clientProfile: null;
      professionalProfile: null;
      clientJobs: [];
      transactions: [];
      withdrawals: [];
    };

const getReportsData = createServerFn({ method: "GET" }).handler(async () => {
  const viewer = getCurrentUser();

  if (!viewer) {
    return {
      viewer: null,
      adminSnapshot: null,
      adminEarningsReport: null,
      clientProfile: null,
      professionalProfile: null,
      clientJobs: [],
      transactions: [],
      withdrawals: [],
    } as ReportsLoaderData;
  }

  if (viewer.role === "ADMIN") {
    return {
      viewer,
      adminSnapshot: getAdminDashboardSnapshot(),
      adminEarningsReport: getAdminEarningsReport(),
      clientProfile: null,
      professionalProfile: null,
      clientJobs: [],
      transactions: [],
      withdrawals: [],
    } as ReportsLoaderData;
  }

  if (viewer.role === "CLIENT") {
    return {
      viewer,
      adminSnapshot: null,
      adminEarningsReport: null,
      clientProfile: getClientProfileByUserId(viewer.id),
      clientJobs: getClientJobsByUserId(viewer.id),
      transactions: getUserProjectTransactions(viewer.id),
      withdrawals: [],
      professionalProfile: null,
    } as ReportsLoaderData;
  }

  return {
    viewer,
    adminSnapshot: null,
    adminEarningsReport: null,
    clientProfile: null,
    professionalProfile: getProfessionalProfileByUserId(viewer.id),
    clientJobs: [],
    transactions: getUserProjectTransactions(viewer.id),
    withdrawals: getProfessionalWithdrawals(viewer.id),
  } as ReportsLoaderData;
});

export const Route = createFileRoute("/reports")({
  beforeLoad: async ({ location }) => {
    const access = await getReportsData();

    if (!access.viewer) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
        },
      });
    }
  },
  loader: () => getReportsData(),
  head: () => ({ meta: [{ title: "Reports - Servio" }] }),
  component: Reports,
});

function Reports() {
  const data = useLoaderData({ from: "/reports" }) as ReportsLoaderData;
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const viewer = data.viewer;
  const viewerRole = viewer?.role ?? "NONE";
  const filteredTransactions = useMemo(
    () => filterTransactions(data.transactions, reportPeriod, searchQuery, viewerRole),
    [data.transactions, reportPeriod, searchQuery, viewerRole],
  );

  if (!data.viewer) {
    return null;
  }

  const viewerName = `${data.viewer.firstName} ${data.viewer.lastName}`.trim() || data.viewer.email;
  const isAdmin = data.viewer.role === "ADMIN";
  const isProfessional = data.viewer.role === "PROFESSIONAL";
  const isClient = data.viewer.role === "CLIENT";

  const reportTitle = isAdmin
    ? "Admin reports"
    : isProfessional
      ? "Professional reports"
      : "Client reports";

  const reportSubtitle = isAdmin
    ? "Platform-wide analytics and CSV exports for revenue, users, jobs, and disputes."
    : isProfessional
      ? "Your earnings, withdrawals, and completed work in one place."
      : "Your posted jobs, spending, and payments dashboard.";

  return (
    <AppShell
      userName={viewerName}
      userRole={isAdmin ? "Admin" : isProfessional ? "Professional" : "Client"}
      userAvatarUrl={data.viewer.avatarUrl}
    >
      <div className="mb-6 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-primary">Reports</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{reportTitle}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{reportSubtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin ? (
            <Button variant="outline" asChild>
              <Link to="/earnings-reports">Open earnings reports</Link>
            </Button>
          ) : null}
          <Button variant="outline" asChild>
            <Link to={isAdmin ? "/admin" : isProfessional ? "/professional-stats" : "/dashboard"}>
              Back to dashboard
            </Link>
          </Button>
        </div>
      </div>

      {isAdmin ? (
        <AdminReportView
          snapshot={data.adminSnapshot}
          earningsReport={data.adminEarningsReport}
          reportPeriod={reportPeriod}
          setReportPeriod={setReportPeriod}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filteredTransactions={filteredTransactions}
        />
      ) : isProfessional ? (
        <ProfessionalReportView
          profile={data.professionalProfile}
          transactions={filteredTransactions}
          withdrawals={data.withdrawals}
          reportPeriod={reportPeriod}
          setReportPeriod={setReportPeriod}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      ) : (
        <ClientReportView
          profile={data.clientProfile}
          jobs={data.clientJobs}
          transactions={filteredTransactions}
          reportPeriod={reportPeriod}
          setReportPeriod={setReportPeriod}
          searchQuery={searchQuery}
        />
      )}
    </AppShell>
  );
}

function AdminReportView({
  snapshot,
  earningsReport,
  reportPeriod,
  setReportPeriod,
  searchQuery,
  setSearchQuery,
  filteredTransactions,
}: {
  snapshot: AdminDashboardSnapshot;
  earningsReport: AdminEarningsReport;
  reportPeriod: ReportPeriod;
  setReportPeriod: (period: ReportPeriod) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  filteredTransactions: ProjectTransactionRecord[];
}) {
  const earningsTotal = earningsReport.totals.grossEarnings;
  const availableBalance = earningsReport.totals.availableBalance;
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Users} label="Total users" value={String(snapshot.stats.totalUsers)} />
        <SummaryCard icon={Briefcase} label="Total jobs" value={String(snapshot.stats.totalJobs)} />
        <SummaryCard
          icon={ShieldCheck}
          label="Open disputes"
          value={String(snapshot.stats.openDisputes)}
        />
        <SummaryCard
          icon={Wallet}
          label="Gross revenue"
          value={formatMoney(snapshot.stats.totalRevenue)}
        />
      </div>

      <ReportControls
        period={reportPeriod}
        onPeriodChange={setReportPeriod}
        query={searchQuery}
        onQueryChange={setSearchQuery}
      />

      <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Earnings overview</h2>
            <p className="text-sm text-muted-foreground">
              Download platform-wide transactions and payout summaries for the selected period.
            </p>
          </div>
          <Button variant="outline" type="button" onClick={() => downloadAdminCsv(earningsReport)}>
            <ArrowDownToLine className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <ReportStat label="Gross earnings" value={formatMoney(earningsTotal)} />
          <ReportStat label="Available balance" value={formatMoney(availableBalance)} />
          <ReportStat
            label="Professionals earning"
            value={String(earningsReport.totals.professionalsWithEarnings)}
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Recent transactions</h2>
              <p className="text-sm text-muted-foreground">
                Filter by client, professional, or payment description.
              </p>
            </div>
            <Badge>{filteredTransactions.length} rows</Badge>
          </div>

          <div className="mt-4 space-y-3">
            {filteredTransactions.slice(0, 6).map((transaction) => (
              <TransactionRow key={transaction.id} transaction={transaction} />
            ))}
            {!filteredTransactions.length ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                No matching transactions for this filter.
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Platform snapshot</h2>
              <p className="text-sm text-muted-foreground">
                Current metrics from the admin dashboard.
              </p>
            </div>
            <Badge>Live</Badge>
          </div>

          <div className="mt-5 grid gap-3">
            <SnapshotRow label="Clients" value={String(snapshot.stats.clients)} />
            <SnapshotRow label="Professionals" value={String(snapshot.stats.professionals)} />
            <SnapshotRow
              label="Completed transactions"
              value={String(snapshot.stats.completedTransactions)}
            />
            <SnapshotRow label="Today revenue" value={formatMoney(snapshot.stats.todayRevenue)} />
          </div>
        </section>
      </div>
    </div>
  );
}

function ProfessionalReportView({
  profile,
  transactions,
  withdrawals,
  reportPeriod,
  setReportPeriod,
  searchQuery,
  setSearchQuery,
}: {
  profile: ReturnType<typeof getProfessionalProfileByUserId>;
  transactions: ProjectTransactionRecord[];
  withdrawals: ProjectWithdrawalRecord[];
  reportPeriod: ReportPeriod;
  setReportPeriod: (period: ReportPeriod) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
}) {
  const completed = transactions.length;
  const earned = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const lastPaid = transactions[0]?.createdAt || null;
  const pendingWithdrawals = withdrawals.filter((withdrawal) => withdrawal.status !== "REJECTED");

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Wallet} label="Completed earnings" value={formatMoney(earned)} />
        <SummaryCard icon={TrendingUp} label="Completed payouts" value={String(completed)} />
        <SummaryCard
          icon={ArrowDownToLine}
          label="Pending requests"
          value={String(pendingWithdrawals.length)}
        />
        <SummaryCard
          icon={CalendarRange}
          label="Last payment"
          value={lastPaid ? formatDate(lastPaid) : "—"}
        />
      </div>

      <ReportControls
        period={reportPeriod}
        onPeriodChange={setReportPeriod}
        query={searchQuery}
        onQueryChange={setSearchQuery}
      />

      <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Earnings history</h2>
            <p className="text-sm text-muted-foreground">
              Download your earnings report for the selected period.
            </p>
          </div>
          <Button
            variant="outline"
            type="button"
            onClick={() => downloadProfessionalCsv(transactions)}
          >
            <ArrowDownToLine className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        <div className="mt-6 space-y-3">
          {transactions.slice(0, 6).map((transaction) => (
            <TransactionRow key={transaction.id} transaction={transaction} />
          ))}
          {!transactions.length ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
              No earnings found for this period.
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Withdrawal activity</h2>
            <p className="text-sm text-muted-foreground">
              Recent payout request statuses and requested amounts.
            </p>
          </div>
          <Badge>{withdrawals.length} requests</Badge>
        </div>

        <div className="mt-5 space-y-3">
          {withdrawals.slice(0, 5).map((withdrawal) => (
            <div key={withdrawal.id} className="rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{withdrawal.destinationLabel}</p>
                  <p className="text-sm text-muted-foreground">{withdrawal.destinationType}</p>
                </div>
                <span className="font-semibold">{formatMoney(withdrawal.amount)}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Status: {withdrawal.status}</p>
            </div>
          ))}
          {!withdrawals.length ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
              No withdrawal activity yet.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function ClientReportView({
  profile,
  jobs,
  transactions,
  reportPeriod,
  setReportPeriod,
  searchQuery,
  setSearchQuery,
}: {
  profile: ReturnType<typeof getClientProfileByUserId>;
  jobs: Awaited<ReturnType<typeof getClientJobsByUserId>>;
  transactions: ProjectTransactionRecord[];
  reportPeriod: ReportPeriod;
  setReportPeriod: (period: ReportPeriod) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
}) {
  const openJobs = jobs.filter((job) => job.status === "OPEN").length;
  const closedJobs = jobs.filter((job) => job.status === "CLOSED").length;
  const spend = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const lastPayment = transactions[0]?.createdAt || null;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Briefcase} label="Posted jobs" value={String(jobs.length)} />
        <SummaryCard icon={ClipboardList} label="Open jobs" value={String(openJobs)} />
        <SummaryCard icon={Wallet} label="Total spend" value={formatMoney(spend)} />
        <SummaryCard
          icon={CalendarRange}
          label="Last payment"
          value={lastPayment ? formatDate(lastPayment) : "—"}
        />
      </div>

      <ReportControls
        period={reportPeriod}
        onPeriodChange={setReportPeriod}
        query={searchQuery}
        onQueryChange={setSearchQuery}
      />

      <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Job activity</h2>
            <p className="text-sm text-muted-foreground">
              Review your recent project performance and status breakdown.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => downloadClientCsv(profile, jobs, transactions)}
            >
              <ArrowDownToLine className="mr-2 h-4 w-4" />
              Export CSV
            </Button>

            <PdfExportControls profile={profile} jobs={jobs} transactions={transactions} />
          </div>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          {jobs.slice(0, 5).map((job) => (
            <div key={job.id} className="rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{job.title}</p>
                  <p className="text-sm text-muted-foreground">{job.status}</p>
                </div>
                <span className="text-sm text-muted-foreground">{job.category}</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Budget: {formatMoney(job.budgetMax ?? job.budgetMin ?? 0)}
              </p>
            </div>
          ))}
          {!jobs.length ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
              No jobs found yet. Post a job to start tracking performance.
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Recent payments</h2>
            <p className="text-sm text-muted-foreground">
              See completed payments connected to your projects.
            </p>
          </div>
          <Badge>{transactions.length} payments</Badge>
        </div>

        <div className="mt-5 space-y-3">
          {transactions.slice(0, 6).map((transaction) => (
            <TransactionRow key={transaction.id} transaction={transaction} />
          ))}
          {!transactions.length ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
              No completed payments available for your account.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function PdfExportControls({
  profile,
  jobs,
  transactions,
}: {
  profile: ReturnType<typeof getClientProfileByUserId>;
  jobs: Awaited<ReturnType<typeof getClientJobsByUserId>>;
  transactions: ProjectTransactionRecord[];
}) {
  const [show, setShow] = useState(false);
  const [sections, setSections] = useState({ jobs: true, payments: true, summary: true });

  function toggleSection(key: keyof typeof sections) {
    setSections((s) => ({ ...s, [key]: !s[key] }));
  }

  async function downloadPdf() {
    const html = generateClientPdfHtml(profile, jobs, transactions, sections);
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    // Wait for resources to render, then call print
    setTimeout(() => {
      try {
        w.print();
        // do not auto-close; leave to user
      } catch (e) {
        // ignore
      }
    }, 500);
  }

  return (
    <div className="relative">
      <Button variant="outline" type="button" onClick={() => setShow((v) => !v)}>
        <ArrowDownToLine className="mr-2 h-4 w-4" />
        Download PDF
      </Button>

      {show ? (
        <div className="absolute right-0 z-50 mt-2 w-[260px] rounded-lg border border-border bg-card p-4 shadow-soft">
          <p className="mb-2 text-sm font-semibold">Include in PDF</p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={sections.summary}
              onChange={() => toggleSection("summary")}
            />
            <span className="text-sm">Summary</span>
          </label>
          <label className="mt-2 flex items-center gap-2">
            <input type="checkbox" checked={sections.jobs} onChange={() => toggleSection("jobs")} />
            <span className="text-sm">Jobs</span>
          </label>
          <label className="mt-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={sections.payments}
              onChange={() => toggleSection("payments")}
            />
            <span className="text-sm">Payments</span>
          </label>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShow(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => downloadPdf()}>
              Generate PDF
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ReportControls({
  period,
  onPeriodChange,
  query,
  onQueryChange,
}: {
  period: ReportPeriod;
  onPeriodChange: (period: ReportPeriod) => void;
  query: string;
  onQueryChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-3 rounded-3xl border border-border bg-card p-6 shadow-soft sm:grid-cols-[1fr_240px] lg:grid-cols-[1.2fr_320px] xl:grid-cols-[1fr_240px]">
      <div>
        <h2 className="text-lg font-semibold">Report filters</h2>
        <p className="text-sm text-muted-foreground">
          Filter analytics to the selected date range and search term.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search transactions or jobs..."
        />
        <Select value={period} onValueChange={(value) => onPeriodChange(value as ReportPeriod)}>
          <SelectTrigger>
            <SelectValue placeholder="Time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All time</SelectItem>
            <SelectItem value="30_DAYS">Last 30 days</SelectItem>
            <SelectItem value="90_DAYS">Last 90 days</SelectItem>
            <SelectItem value="THIS_YEAR">This year</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Globe;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-muted text-muted-foreground">
          <Icon className="h-5 w-5" />
        </span>
        <Badge>Report</Badge>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function ReportStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-border bg-background p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4 text-sm text-muted-foreground">
      <p>{label}</p>
      <p className="mt-2 text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}

function TransactionRow({ transaction }: { transaction: ProjectTransactionRecord }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">
            {transaction.projectTitle ||
              transaction.description ||
              `Project #${transaction.trackingId}`}
          </p>
          <p className="text-sm text-muted-foreground">
            {transaction.projectCategory || "Project"}
          </p>
        </div>
        <div className="text-right">
          <p className="font-semibold">{formatMoney(transaction.amount)}</p>
          <p className="text-xs text-muted-foreground">{formatDate(transaction.createdAt)}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>{transaction.status}</span>
        <span>{transaction.paymentType}</span>
        <span>{transaction.clientId ? `Client #${transaction.clientId}` : "Client unknown"}</span>
        <span>
          {transaction.professionalId
            ? `Pro #${transaction.professionalId}`
            : "Professional unknown"}
        </span>
      </div>
    </div>
  );
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function filterTransactions(
  transactions: ProjectTransactionRecord[],
  period: ReportPeriod,
  query: string,
  role: "ADMIN" | "CLIENT" | "PROFESSIONAL",
) {
  return transactions.filter((transaction) => {
    if (!isInReportPeriod(transaction.createdAt, period)) {
      return false;
    }

    if (!query.trim()) {
      return true;
    }

    const normalized = query.trim().toLowerCase();
    return (
      transaction.projectTitle?.toLowerCase().includes(normalized) ||
      transaction.description?.toLowerCase().includes(normalized) ||
      transaction.clientName?.toLowerCase().includes(normalized) ||
      transaction.professionalName?.toLowerCase().includes(normalized)
    );
  });
}

function isInReportPeriod(value: string, period: ReportPeriod) {
  if (period === "ALL") {
    return true;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);

  if (period === "THIS_YEAR") {
    return date.getFullYear() === now.getFullYear();
  }

  const days = period === "30_DAYS" ? 30 : 90;
  const threshold = new Date(now);
  threshold.setDate(now.getDate() - days);
  return date >= threshold;
}

function downloadAdminCsv(report: AdminEarningsReport) {
  const rows = [
    ["Report", "Generated At", report.generatedAt],
    ["Totals", "Gross Earnings", String(report.totals.grossEarnings)],
    ["Totals", "Commission", String(report.totals.commissionAmount)],
    ["Totals", "Net Earnings", String(report.totals.netEarnings)],
    ["", "Requested Payouts", String(report.totals.requestedPayouts)],
    ["", "Available Balance", String(report.totals.availableBalance)],
    [""],
    ["Transactions"],
    ["ID", "Client", "Professional", "Project", "Category", "Amount", "Status", "Date"],
    ...report.transactions.map((transaction) => [
      String(transaction.id),
      transaction.clientName,
      transaction.professionalName,
      transaction.jobTitle,
      transaction.projectCategory,
      String(transaction.grossAmount),
      transaction.status,
      transaction.dateTime,
    ]),
  ];

  downloadCsvFile(rows, `servio-admin-report-${new Date().toISOString().slice(0, 10)}.csv`);
}

function downloadProfessionalCsv(transactions: ProjectTransactionRecord[]) {
  const rows = [
    ["Professional Earnings Report", "Generated At", new Date().toISOString()],
    [""],
    ["ID", "Project", "Category", "Amount", "Status", "Date"],
    ...transactions.map((transaction) => [
      String(transaction.id),
      transaction.projectTitle,
      transaction.projectCategory,
      String(transaction.amount),
      transaction.status,
      transaction.createdAt,
    ]),
  ];

  downloadCsvFile(rows, `servio-professional-report-${new Date().toISOString().slice(0, 10)}.csv`);
}

function downloadClientCsv(
  profile: ReturnType<typeof getClientProfileByUserId>,
  jobs: Awaited<ReturnType<typeof getClientJobsByUserId>>,
  transactions: ProjectTransactionRecord[],
) {
  const rows = [
    ["Client Reports", "Generated At", new Date().toISOString()],
    ["Client", profile?.companyName || profile?.fullName || "Client"],
    [""],
    ["Jobs"],
    ["ID", "Title", "Status", "Category", "Budget"],
    ...jobs.map((job) => [
      String(job.id),
      job.title,
      job.status,
      job.category,
      formatMoney(job.budgetMax ?? job.budgetMin ?? 0),
    ]),
    [""],
    ["Payments"],
    ["ID", "Project", "Amount", "Status", "Date"],
    ...transactions.map((transaction) => [
      String(transaction.id),
      transaction.projectTitle,
      String(transaction.amount),
      transaction.status,
      transaction.createdAt,
    ]),
  ];

  downloadCsvFile(rows, `servio-client-report-${new Date().toISOString().slice(0, 10)}.csv`);
}

function generateClientPdfHtml(
  profile: ReturnType<typeof getClientProfileByUserId> | undefined,
  jobs: Awaited<ReturnType<typeof getClientJobsByUserId>>,
  transactions: ProjectTransactionRecord[],
  sections: { jobs: boolean; payments: boolean; summary: boolean },
) {
  const styles = `
    body { font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; color: #0f172a; padding: 24px; }
    h1 { font-size: 20px; margin-bottom: 8px; }
    h2 { font-size: 16px; margin: 12px 0 8px; }
    .summary { display: flex; gap: 12px; }
    .card { border: 1px solid #e6edf3; border-radius: 10px; padding: 12px; background: #fff; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid #f1f5f9; font-size: 12px }
    .meta { color: #475569; font-size: 12px }
  `;

  const company = profile?.companyName || profile?.fullName || "Client";

  let body = `<div><h1>${escapeHtml(company)} — Client Report</h1><div class="meta">Generated: ${new Date().toLocaleString()}</div>`;

  if (sections.summary) {
    const totalJobs = jobs.length;
    const openJobs = jobs.filter((j) => j.status === "OPEN").length;
    const spend = transactions.reduce((s, t) => s + t.amount, 0);
    body += `<h2>Summary</h2><div class="summary"><div class="card"><div>Total jobs</div><div><strong>${totalJobs}</strong></div></div><div class="card"><div>Open jobs</div><div><strong>${openJobs}</strong></div></div><div class="card"><div>Total spend</div><div><strong>${formatMoney(spend)}</strong></div></div></div>`;
  }

  if (sections.jobs) {
    body += `<h2>Jobs</h2><table><thead><tr><th>ID</th><th>Title</th><th>Status</th><th>Category</th><th>Budget</th></tr></thead><tbody>`;
    for (const job of jobs) {
      body += `<tr><td>${job.id}</td><td>${escapeHtml(job.title)}</td><td>${job.status}</td><td>${escapeHtml(job.category || "")}</td><td>${escapeHtml(formatMoney(job.budgetMax ?? job.budgetMin ?? 0))}</td></tr>`;
    }
    body += `</tbody></table>`;
  }

  if (sections.payments) {
    body += `<h2>Payments</h2><table><thead><tr><th>ID</th><th>Project</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead><tbody>`;
    for (const t of transactions) {
      body += `<tr><td>${t.id}</td><td>${escapeHtml(t.projectTitle || t.description || `Project #${t.trackingId}`)}</td><td>${escapeHtml(formatMoney(t.amount))}</td><td>${t.status}</td><td>${escapeHtml(formatDate(t.createdAt))}</td></tr>`;
    }
    body += `</tbody></table>`;
  }

  body += `</div>`;

  return `<!doctype html><html><head><meta charset="utf-8"><title>Client report</title><style>${styles}</style></head><body>${body}</body></html>`;
}

function escapeHtml(str: unknown) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function downloadCsvFile(rows: Array<Array<string>>) {
  const csv = rows
    .map((row) => row.map((value) => JSON.stringify(value ?? "")).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `servio-report-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
