import { createServerFn } from "@tanstack/react-start";
import { createFileRoute, Link, redirect, useLoaderData, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownToLine,
  Briefcase,
  CalendarRange,
  FileText,
  Filter,
  RefreshCcw,
  ShieldCheck,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { AdminReportExportButton } from "@/components/AdminReportExportButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCurrentUser } from "@/lib/current-user.server";
import {
  getViewerReportsData,
  saveReportExport,
  type DashboardReportData,
  type ReportFilters,
} from "@/lib/reports.server";

type ReportPeriod = ReportFilters["period"];

type ReportsLoaderData = {
  viewer: {
    id: number;
    role: "ADMIN" | "CLIENT" | "PROFESSIONAL";
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string | null;
  } | null;
  reportData: DashboardReportData | null;
};

const getReportsData = createServerFn({ method: "GET" }).handler(async () => {
  const viewer = getCurrentUser();
  const reportData = getViewerReportsData(viewer, {
    period: "ALL",
  });

  return {
    viewer,
    reportData,
  } satisfies ReportsLoaderData;
});

const createReportExport = createServerFn({ method: "POST" })
  .inputValidator((input: { ownerId: number; role: "ADMIN" | "CLIENT" | "PROFESSIONAL"; reportName: string; filters: ReportFilters; html: string; generatedBy: string }) => input)
  .handler(async ({ data }) => {
    const viewer = getCurrentUser();
    if (!viewer) {
      throw new Error("You must be signed in to generate reports.");
    }
    return saveReportExport({
      ownerId: data.ownerId,
      role: data.role,
      reportName: data.reportName,
      filters: data.filters,
      content: data.html,
      generatedBy: data.generatedBy,
    });
  });

export const Route = createFileRoute("/reports/new")({
  beforeLoad: async ({ location }) => {
    const access = await getReportsData();
    if (!access.viewer) {
      throw new Error("Authentication required");
    }
    return access;
  },
  loader: () => getReportsData(),
  head: () => ({ meta: [{ title: "Reports - Servio" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const router = useRouter();
  const data = useLoaderData({ from: "/reports" }) as ReportsLoaderData;
  const [period, setPeriod] = useState<ReportPeriod>("ALL");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("");
  const [rating, setRating] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const reportData = useMemo(() => {
    if (!data.reportData) {
      return null;
    }
    return getViewerReportsData(data.viewer, {
      period,
      status: status || undefined,
      search: search || undefined,
      category: category || undefined,
      city: city || undefined,
      state: state || undefined,
      country: country || undefined,
      paymentMethod: paymentMethod || undefined,
      verificationStatus: verificationStatus || undefined,
      rating: rating || undefined,
    });
  }, [data.reportData, data.viewer, period, status, search, category, city, state, country, paymentMethod, verificationStatus, rating]);

  if (!data.viewer || !reportData) {
    return (
      <div className="grid min-h-screen place-items-center bg-muted/30 px-4">
        <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 text-center shadow-soft">
          <ShieldCheck className="mx-auto h-8 w-8 text-primary" />
          <h1 className="mt-4 text-xl font-semibold">Sign in to access reports</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your reports are loaded from the live platform database.</p>
          <Button asChild className="mt-5 w-full">
            <Link to="/login">Open login</Link>
          </Button>
        </div>
      </div>
    );
  }

  const viewerName = `${data.viewer.firstName} ${data.viewer.lastName}`.trim() || data.viewer.email;
  const pageTitle = reportData.role === "ADMIN" ? "Admin reports" : reportData.role === "PROFESSIONAL" ? "Professional reports" : "Client reports";
  const dashboardStats = reportData.summaryCards;
  const chartData = buildChartData(reportData.jobs, reportData.transactions, reportData.reviews);

  async function handleExport(payload: { reportName: string; html: string; sections: string[] }) {
    setIsExporting(true);
    try {
      await createReportExport({
        data: {
          ownerId: data.viewer!.id,
          role: reportData.role,
          reportName: payload.reportName,
          filters: {
            period,
            status: status || undefined,
            search: search || undefined,
            category: category || undefined,
            city: city || undefined,
            state: state || undefined,
            country: country || undefined,
            paymentMethod: paymentMethod || undefined,
            verificationStatus: verificationStatus || undefined,
            rating: rating || undefined,
          },
          html: payload.html,
          generatedBy: viewerName,
        },
      });
      await router.invalidate();
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <AppShell userName={viewerName} userRole={reportData.role === "ADMIN" ? "Admin" : reportData.role === "PROFESSIONAL" ? "Professional" : "Client"} userAvatarUrl={data.viewer.avatarUrl}>
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-primary">Reports</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{pageTitle}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Live reports generated from the existing database records with filters, charts, and export history.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" type="button" onClick={() => router.invalidate()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" type="button">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <AdminReportExportButton buttonLabel="Download report" reportName={`${pageTitle} export`} summaryItems={dashboardStats.map((card) => ({ label: card.label, value: card.value }))} rows={buildRows(reportData)} onGenerate={handleExport} />
        </div>
      </div>

      <div className="grid gap-3 rounded-3xl border border-border bg-card p-4 shadow-soft md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-border bg-background/60 p-4">
          <p className="text-sm text-muted-foreground">Period</p>
          <Select value={period} onValueChange={(value) => setPeriod(value as ReportPeriod)}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="All time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All time</SelectItem>
              <SelectItem value="TODAY">Today</SelectItem>
              <SelectItem value="YESTERDAY">Yesterday</SelectItem>
              <SelectItem value="LAST_7_DAYS">Last 7 days</SelectItem>
              <SelectItem value="LAST_30_DAYS">Last 30 days</SelectItem>
              <SelectItem value="THIS_MONTH">This month</SelectItem>
              <SelectItem value="LAST_MONTH">Last month</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-2xl border border-border bg-background/60 p-4">
          <p className="text-sm text-muted-foreground">Status</p>
          <Input value={status} onChange={(event) => setStatus(event.target.value)} placeholder="Completed, pending, etc." className="mt-2" />
        </div>
        <div className="rounded-2xl border border-border bg-background/60 p-4">
          <p className="text-sm text-muted-foreground">Search</p>
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search records" className="mt-2" />
        </div>
        <div className="rounded-2xl border border-border bg-background/60 p-4">
          <p className="text-sm text-muted-foreground">Rating</p>
          <Input value={rating} onChange={(event) => setRating(event.target.value)} placeholder="5, 4, 3" className="mt-2" />
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded-3xl border border-border bg-card p-4 shadow-soft">
          <p className="text-sm text-muted-foreground">Category</p>
          <Input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Category" className="mt-2" />
        </div>
        <div className="rounded-3xl border border-border bg-card p-4 shadow-soft">
          <p className="text-sm text-muted-foreground">Location</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Input value={city} onChange={(event) => setCity(event.target.value)} placeholder="City" />
            <Input value={state} onChange={(event) => setState(event.target.value)} placeholder="State" />
          </div>
        </div>
        <div className="rounded-3xl border border-border bg-card p-4 shadow-soft">
          <p className="text-sm text-muted-foreground">Advanced filters</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Input value={country} onChange={(event) => setCountry(event.target.value)} placeholder="Country" />
            <Input value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} placeholder="Payment method" />
          </div>
          {reportData.role === "ADMIN" ? (
            <div className="mt-2">
              <Input value={verificationStatus} onChange={(event) => setVerificationStatus(event.target.value)} placeholder="Verification status" />
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {dashboardStats.map((card) => (
          <div key={card.label} className="rounded-3xl border border-border bg-card p-5 shadow-soft transition-transform hover:-translate-y-0.5">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-2xl bg-muted p-2 text-muted-foreground">
                {iconFor(card.icon)}
              </span>
              <Badge variant="secondary">Live</Badge>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{card.value}</p>
            <p className="mt-2 text-xs text-muted-foreground">{card.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">Activity overview</h2>
              <p className="text-sm text-muted-foreground">Recent performance across jobs, transactions, and reviews.</p>
            </div>
            <Badge>{reportData.jobs.length} jobs</Badge>
          </div>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="jobs" fill="#4f46e5" radius={[8, 8, 0, 0]} />
                <Bar dataKey="transactions" fill="#0f766e" radius={[8, 8, 0, 0]} />
                <Bar dataKey="reviews" fill="#f59e0b" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">Export history</h2>
              <p className="text-sm text-muted-foreground">Every generated report is saved to the report history list.</p>
            </div>
            <Badge>{reportData.history.length}</Badge>
          </div>
          <div className="mt-5 space-y-3">
            {reportData.history.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-border bg-background/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{entry.reportName}</p>
                    <p className="text-sm text-muted-foreground">{entry.filtersUsed}</p>
                  </div>
                  <Badge variant="secondary">{entry.fileSize}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span>{entry.generatedBy}</span>
                  <span>{new Date(entry.generatedAt).toLocaleString()}</span>
                  <span>{entry.downloadCount} downloads</span>
                </div>
              </div>
            ))}
            {!reportData.history.length ? <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">No exports yet. Generate a report to populate this history.</div> : null}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Filtered records</h2>
            <p className="text-sm text-muted-foreground">The report displays only the records that match the active filters.</p>
          </div>
          <Badge>{reportData.jobs.length + reportData.transactions.length + reportData.reviews.length + reportData.disputes.length} matching records</Badge>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border bg-background/70 p-4">
            <p className="text-sm font-semibold">Jobs</p>
            <p className="mt-2 text-sm text-muted-foreground">{reportData.jobs.length} records</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/70 p-4">
            <p className="text-sm font-semibold">Transactions</p>
            <p className="mt-2 text-sm text-muted-foreground">{reportData.transactions.length} records</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/70 p-4">
            <p className="text-sm font-semibold">Reviews</p>
            <p className="mt-2 text-sm text-muted-foreground">{reportData.reviews.length} records</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/70 p-4">
            <p className="text-sm font-semibold">Disputes</p>
            <p className="mt-2 text-sm text-muted-foreground">{reportData.disputes.length} records</p>
          </div>
        </div>
      </section>
      {isExporting ? <div className="mt-4 text-sm text-muted-foreground">Saving report history…</div> : null}
    </AppShell>
  );
}

function iconFor(name: DashboardReportData["summaryCards"][number]["icon"]) {
  switch (name) {
    case "users":
      return <Users className="h-5 w-5" />;
    case "jobs":
      return <Briefcase className="h-5 w-5" />;
    case "wallet":
      return <Wallet className="h-5 w-5" />;
    case "review":
      return <FileText className="h-5 w-5" />;
    case "dispute":
      return <ShieldCheck className="h-5 w-5" />;
    default:
      return <TrendingUp className="h-5 w-5" />;
  }
}

function buildChartData(jobs: Array<Record<string, unknown>>, transactions: Array<Record<string, unknown>>, reviews: Array<Record<string, unknown>>) {
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    return date.toLocaleString("en-US", { month: "short" });
  });

  return months.map((name, index) => ({
    name,
    jobs: jobs.filter((job) => monthIndex(job.createdAt as string | undefined) === index + (new Date().getMonth() - 5)).length,
    transactions: transactions.filter((transaction) => monthIndex(transaction.createdAt as string | undefined) === index + (new Date().getMonth() - 5)).length,
    reviews: reviews.filter((review) => monthIndex(review.createdAt as string | undefined) === index + (new Date().getMonth() - 5)).length,
  }));
}

function monthIndex(value: string | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.getMonth();
}

function buildRows(reportData: DashboardReportData) {
  return [
    ...reportData.summaryCards.map((card) => ({ label: card.label, value: card.value })),
    { label: "Role", value: reportData.role },
    { label: "Viewer", value: reportData.viewerName },
    { label: "Jobs", value: String(reportData.jobs.length) },
    { label: "Transactions", value: String(reportData.transactions.length) },
    { label: "Reviews", value: String(reportData.reviews.length) },
    { label: "Disputes", value: String(reportData.disputes.length) },
  ];
}
