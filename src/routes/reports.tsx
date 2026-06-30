import { createServerFn } from "@tanstack/react-start";
import { createFileRoute, Link, redirect, useLoaderData, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
  Briefcase,
  CreditCard,
  FileText,
  FolderKanban,
  LayoutGrid,
  RefreshCcw,
  ShieldCheck,
  Star,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { AdminReportExportButton } from "@/components/AdminReportExportButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/current-user.server";
import {
  getViewerReportsData,
  saveReportExport,
  type DashboardReportData,
  type ReportFilters,
} from "@/lib/reports.server";

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
  const reportData = getViewerReportsData(viewer, { period: "ALL" });
  return { viewer, reportData } satisfies ReportsLoaderData;
});

const createReportExport = createServerFn({ method: "POST" })
  .inputValidator((input: {
    ownerId: number;
    role: "ADMIN" | "CLIENT" | "PROFESSIONAL";
    reportName: string;
    filters: ReportFilters;
    html: string;
    generatedBy: string;
    categories?: string[];
    dateRange?: string;
    format?: string;
    options?: Record<string, boolean>;
  }) => input)
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

export const Route = createFileRoute("/reports")({
  beforeLoad: async ({ location }) => {
    const access = await getReportsData();
    if (!access.viewer) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  loader: () => getReportsData(),
  head: () => ({ meta: [{ title: "Reports - Servio" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const router = useRouter();
  const data = useLoaderData({ from: "/reports" }) as ReportsLoaderData;
  const [isExporting, setIsExporting] = useState(false);

  const reportData = data.reportData;

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
  const viewerRole = reportData.role === "ADMIN" ? "Admin" : reportData.role === "PROFESSIONAL" ? "Professional" : "Client";
  const pageTitle = reportData.role === "ADMIN" ? "Admin Reports" : reportData.role === "PROFESSIONAL" ? "Professional Reports" : "Client Reports";
  const subtitle = reportData.role === "ADMIN" ? "Live reports generated from the database." : reportData.role === "PROFESSIONAL" ? "View and download your work reports." : "Download reports related to your account.";
  const summaryCards = buildSummaryCards(reportData);
  const reportCards = buildReportCards(reportData);

  async function handleExport(payload: { reportName: string; html: string; sections: string[]; categories: string[]; dateRange: string; format: string; options: Record<string, boolean> }) {
    setIsExporting(true);
    try {
      await createReportExport({
        data: {
          ownerId: data.viewer!.id,
          role: reportData.role,
          reportName: payload.reportName,
          filters: { period: "ALL" },
          html: payload.html,
          generatedBy: viewerName,
          categories: payload.categories,
          dateRange: payload.dateRange,
          format: payload.format,
          options: payload.options,
        },
      });
      await router.invalidate();
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <AppShell userName={viewerName} userRole={viewerRole} userAvatarUrl={data.viewer.avatarUrl}>
      <div className="space-y-8 px-1 py-2">
        {/* Header Section */}
        <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-8 shadow-lg">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Reports Dashboard</p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">{pageTitle}</h1>
              <p className="mt-3 max-w-xl text-base text-slate-600">{subtitle}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" type="button" onClick={() => router.invalidate()} className="gap-2">
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
              <AdminReportExportButton buttonLabel="Download report" reportName={`${pageTitle} export`} summaryItems={summaryCards.map((card) => ({ label: card.label, value: card.value }))} rows={buildRows(reportData)} recordCounts={buildRecordCounts(reportData)} onGenerate={handleExport} initialSelected={buildInitialSelection(reportData.role)} />
            </div>
          </div>
        </section>

        {/* Summary Cards Section */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div key={card.label} className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-gradient-to-br from-blue-50 to-slate-100 p-3 text-slate-700">{card.icon}</div>
                <Badge className="bg-green-100 text-green-700">Live</Badge>
              </div>
              <p className="mt-4 text-sm font-medium text-slate-600">{card.label}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{card.value}</p>
              <p className="mt-2 text-xs text-slate-500">{card.hint}</p>
            </div>
          ))}
        </section>

        {/* Main Content Grid */}
        <section className="grid gap-8 lg:grid-cols-[1fr_1fr]">
          {/* Available Reports */}
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
            <div className="mb-6 border-b border-slate-200 pb-6">
              <h2 className="text-2xl font-bold text-slate-900">Available Reports</h2>
              <p className="mt-2 text-sm text-slate-600">Select sections to include in your export</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {reportCards.map((card) => (
                <div key={card.title} className="group rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 transition-all hover:border-slate-300 hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="rounded-lg bg-white p-2 text-slate-700">{card.icon}</div>
                    <Badge variant="outline" className="text-xs">{card.count} items</Badge>
                  </div>
                  <h3 className="mt-4 font-semibold text-slate-900">{card.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{card.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-slate-400">{card.updated}</span>
                    <Button variant="outline" size="sm" type="button" className="text-xs">
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Download History */}
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
            <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Download History</h2>
                <p className="mt-2 text-sm text-slate-600">Your recent exports</p>
              </div>
              <Badge className="bg-blue-100 text-blue-700 text-sm">{reportData.history.length}</Badge>
            </div>
            <div className="space-y-3">
              {reportData.history.length > 0 ? (
                reportData.history.map((entry) => (
                  <div key={entry.id} className="group rounded-lg border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-4 transition-all hover:shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{entry.reportName}</p>
                        <p className="mt-1 text-xs text-slate-500">{entry.filtersUsed}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">{entry.fileSize}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="inline-block">{entry.generatedBy}</span>
                      <span className="text-slate-300">•</span>
                      <span className="inline-block">{new Date(entry.generatedAt).toLocaleString()}</span>
                      <span className="text-slate-300">•</span>
                      <span className="inline-block">{entry.downloadCount} downloads</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 py-12 text-center">
                  <p className="text-sm text-slate-500">No reports generated yet</p>
                  <p className="mt-1 text-xs text-slate-400">Create your first report to see it here</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Export Status */}
        {isExporting && (
          <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <div className="h-2 w-2 animate-pulse rounded-full bg-blue-600"></div>
            <span className="text-sm font-medium text-blue-900">Saving report history…</span>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function buildSummaryCards(reportData: DashboardReportData) {
  const completedPayments = reportData.transactions.filter((row) => String(row.status || "").toUpperCase() === "COMPLETED");
  const revenue = completedPayments.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const pendingDisputes = reportData.disputes.filter((row) => !["RESOLVED", "CLOSED"].includes(String(row.status || "").toUpperCase())).length;

  if (reportData.role === "ADMIN") {
    return [
      { label: "Total users", value: String(reportData.users.length), hint: "Active platform accounts", icon: <Users className="h-5 w-5" /> },
      { label: "Total jobs", value: String(reportData.jobs.length), hint: "Open and closed jobs", icon: <Briefcase className="h-5 w-5" /> },
      { label: "Total revenue", value: formatCurrency(revenue), hint: "Completed payments", icon: <CreditCard className="h-5 w-5" /> },
      { label: "Pending disputes", value: String(pendingDisputes), hint: "Open review items", icon: <ShieldCheck className="h-5 w-5" /> },
    ];
  }

  if (reportData.role === "CLIENT") {
    const jobs = reportData.jobs;
    const activeJobs = jobs.filter((job) => !["CLOSED", "CANCELLED"].includes(String(job.status || "").toUpperCase())).length;
    const completedJobs = jobs.filter((job) => String(job.status || "").toUpperCase() === "CLOSED").length;
    return [
      { label: "Jobs posted", value: String(jobs.length), hint: "Your listed work", icon: <Briefcase className="h-5 w-5" /> },
      { label: "Active jobs", value: String(activeJobs), hint: "Currently running", icon: <TrendingUp className="h-5 w-5" /> },
      { label: "Completed jobs", value: String(completedJobs), hint: "Successfully delivered", icon: <ShieldCheck className="h-5 w-5" /> },
      { label: "Total payments", value: formatCurrency(revenue), hint: "Payments processed", icon: <CreditCard className="h-5 w-5" /> },
      { label: "Wallet balance", value: formatCurrency(revenue), hint: "Current available balance", icon: <Wallet className="h-5 w-5" /> },
      { label: "Total downloads", value: String(reportData.history.length), hint: "Exports generated", icon: <FileText className="h-5 w-5" /> },
    ];
  }

  const jobs = reportData.jobs;
  const activeJobs = jobs.filter((job) => !["CLOSED", "CANCELLED"].includes(String(job.status || "").toUpperCase())).length;
  const completedJobs = jobs.filter((job) => String(job.status || "").toUpperCase() === "CLOSED").length;
  return [
    { label: "Jobs applied", value: String(jobs.length), hint: "Applications and work", icon: <Briefcase className="h-5 w-5" /> },
    { label: "Active jobs", value: String(activeJobs), hint: "Currently assigned", icon: <TrendingUp className="h-5 w-5" /> },
    { label: "Completed jobs", value: String(completedJobs), hint: "Delivered successfully", icon: <ShieldCheck className="h-5 w-5" /> },
    { label: "Total earnings", value: formatCurrency(revenue), hint: "Collected payments", icon: <CreditCard className="h-5 w-5" /> },
    { label: "Wallet balance", value: formatCurrency(revenue), hint: "Available credit", icon: <Wallet className="h-5 w-5" /> },
    { label: "Reviews", value: String(reportData.reviews.length), hint: "Client feedback", icon: <Star className="h-5 w-5" /> },
    { label: "Average rating", value: averageRating(reportData.reviews), hint: "Current rating", icon: <Star className="h-5 w-5" /> },
    { label: "Total downloads", value: String(reportData.history.length), hint: "Exports created", icon: <FileText className="h-5 w-5" /> },
  ];
}

function buildReportCards(reportData: DashboardReportData) {
  if (reportData.role === "ADMIN") {
    return [
      { title: "Users", description: "Account roster and verification status", count: reportData.users.length, updated: "Live", icon: <Users className="h-5 w-5" /> },
      { title: "Jobs", description: "Posted and active work requests", count: reportData.jobs.length, updated: "Live", icon: <Briefcase className="h-5 w-5" /> },
      { title: "Payments", description: "Completed transactions and payment activity", count: reportData.transactions.length, updated: "Live", icon: <CreditCard className="h-5 w-5" /> },
      { title: "Wallet", description: "Balance and payout activity", count: reportData.transactions.length, updated: "Live", icon: <Wallet className="h-5 w-5" /> },
      { title: "Earnings", description: "Revenue, commissions and payouts", count: reportData.transactions.length, updated: "Live", icon: <TrendingUp className="h-5 w-5" /> },
      { title: "Verification", description: "Provider verification queue", count: reportData.users.filter((user) => Boolean(user.isVerified)).length, updated: "Live", icon: <ShieldCheck className="h-5 w-5" /> },
      { title: "Reviews", description: "Recent ratings and feedback", count: reportData.reviews.length, updated: "Live", icon: <Star className="h-5 w-5" /> },
      { title: "Disputes", description: "Open disputes and escalations", count: reportData.disputes.length, updated: "Live", icon: <ShieldCheck className="h-5 w-5" /> },
      { title: "Services", description: "Service catalogue overview", count: reportData.jobs.length, updated: "Live", icon: <LayoutGrid className="h-5 w-5" /> },
      { title: "Categories", description: "Service categories and grouping", count: reportData.jobs.length, updated: "Live", icon: <FolderKanban className="h-5 w-5" /> },
    ];
  }

  if (reportData.role === "CLIENT") {
    return [
      { title: "Jobs", description: "Posted and tracked job requests", count: reportData.jobs.length, updated: "Live", icon: <Briefcase className="h-5 w-5" /> },
      { title: "Transactions", description: "Your account transactions", count: reportData.transactions.length, updated: "Live", icon: <CreditCard className="h-5 w-5" /> },
      { title: "Payments", description: "Invoice and payment activity", count: reportData.transactions.length, updated: "Live", icon: <CreditCard className="h-5 w-5" /> },
      { title: "Invoices", description: "Billing and invoice records", count: reportData.transactions.length, updated: "Live", icon: <FileText className="h-5 w-5" /> },
      { title: "Wallet", description: "Current balance and spending", count: reportData.transactions.length, updated: "Live", icon: <Wallet className="h-5 w-5" /> },
      { title: "Reviews", description: "Feedback and review history", count: reportData.reviews.length, updated: "Live", icon: <Star className="h-5 w-5" /> },
    ];
  }

  return [
    { title: "Jobs", description: "Applications and assigned work", count: reportData.jobs.length, updated: "Live", icon: <Briefcase className="h-5 w-5" /> },
    { title: "Applications", description: "Submitted applications and proposals", count: reportData.jobs.length, updated: "Live", icon: <FileText className="h-5 w-5" /> },
    { title: "Transactions", description: "Your completed work transactions", count: reportData.transactions.length, updated: "Live", icon: <CreditCard className="h-5 w-5" /> },
    { title: "Payments", description: "Income and settlement history", count: reportData.transactions.length, updated: "Live", icon: <CreditCard className="h-5 w-5" /> },
    { title: "Earnings", description: "Revenue and payout information", count: reportData.transactions.length, updated: "Live", icon: <TrendingUp className="h-5 w-5" /> },
    { title: "Wallet", description: "Balance and payout requests", count: reportData.transactions.length, updated: "Live", icon: <Wallet className="h-5 w-5" /> },
    { title: "Reviews", description: "Client feedback and testimonials", count: reportData.reviews.length, updated: "Live", icon: <Star className="h-5 w-5" /> },
    { title: "Ratings", description: "Average rating and profile score", count: reportData.reviews.length, updated: "Live", icon: <Star className="h-5 w-5" /> },
    { title: "Payouts", description: "Pending and completed payouts", count: reportData.transactions.length, updated: "Live", icon: <Wallet className="h-5 w-5" /> },
  ];
}

function buildRecordCounts(reportData: DashboardReportData) {
  return {
    Users: reportData.users.length,
    Jobs: reportData.jobs.length,
    Payments: reportData.transactions.length,
    Earnings: reportData.transactions.length,
    Wallet: reportData.transactions.length,
    Reviews: reportData.reviews.length,
    Verification: reportData.users.filter((user) => Boolean(user.isVerified)).length,
    Disputes: reportData.disputes.length,
    Services: reportData.jobs.length,
    Categories: reportData.jobs.length,
  };
}

function buildInitialSelection(role: DashboardReportData["role"]) {
  if (role === "ADMIN") return ["Users"] as const;
  if (role === "CLIENT") return ["Jobs"] as const;
  return ["Jobs"] as const;
}

function buildRows(reportData: DashboardReportData) {
  return [
    { label: "Role", value: reportData.role },
    { label: "Viewer", value: reportData.viewerName },
    { label: "Jobs", value: String(reportData.jobs.length) },
    { label: "Transactions", value: String(reportData.transactions.length) },
    { label: "Reviews", value: String(reportData.reviews.length) },
    { label: "Disputes", value: String(reportData.disputes.length) },
  ];
}

function averageRating(reviews: Array<Record<string, unknown>>) {
  if (!reviews.length) return "0.0";
  const total = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
  return (total / reviews.length).toFixed(1);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}
