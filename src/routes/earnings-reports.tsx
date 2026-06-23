import { createServerFn } from "@tanstack/react-start";
import { createFileRoute, Link, useLoaderData, useRouter } from "@tanstack/react-router";
import type { ComponentType, ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownToLine,
  BadgeDollarSign,
  CalendarRange,
  CheckCircle2,
  CircleDollarSign,
  Download,
  Landmark,
  Percent,
  ReceiptText,
  Search,
  ShieldCheck,
  UserRound,
  Wallet,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
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
  getAdminEarningsReport,
  updateAdminPayoutStatus,
  type AdminEarningsReport,
  type AdminEarningsTransactionRecord,
  type AdminPayoutRecord,
  type AdminProfessionalEarningsSummary,
} from "@/lib/admin-dashboard-db.server";

type PayoutStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "REJECTED";
type ReportPeriod = "ALL" | "30_DAYS" | "90_DAYS" | "THIS_YEAR";

const getEarningsReportsData = createServerFn({ method: "GET" }).handler(async () => {
  const viewer = getCurrentUser();

  if (!viewer || viewer.role !== "ADMIN") {
    return {
      viewer,
      report: null,
    };
  }

  return {
    viewer,
    report: getAdminEarningsReport(),
  };
});

const updatePayoutReviewStatus = createServerFn({ method: "POST" })
  .inputValidator((input: { payoutId: number; status: PayoutStatus }) => input)
  .handler(async ({ data }) => {
    const viewer = getCurrentUser();

    if (!viewer || viewer.role !== "ADMIN") {
      throw new Error("Only admins can update payout status.");
    }

    return updateAdminPayoutStatus(data.payoutId, data.status);
  });

export const Route = createFileRoute("/earnings-reports")({
  loader: () => getEarningsReportsData(),
  head: () => ({ meta: [{ title: "Earnings, Commission & Payout Reports - Servio" }] }),
  component: EarningsReports,
});

function EarningsReports() {
  const data = useLoaderData({ from: "/earnings-reports" });
  const router = useRouter();
  const [transactionQuery, setTransactionQuery] = useState("");
  const [payoutQuery, setPayoutQuery] = useState("");
  const [professionalQuery, setProfessionalQuery] = useState("");
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>("ALL");
  const [transactionStatus, setTransactionStatus] = useState("ALL");
  const [payoutStatus, setPayoutStatus] = useState("ALL");
  const [pendingPayoutId, setPendingPayoutId] = useState<number | null>(null);
  const [summaryResult, setSummaryResult] = useState<"transactions" | "payouts" | "balances" | null>(null);

  if (!data.viewer || data.viewer.role !== "ADMIN" || !data.report) {
    return (
      <div className="grid min-h-screen place-items-center bg-muted/30 px-4">
        <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 text-center shadow-soft">
          <ShieldCheck className="mx-auto h-8 w-8 text-primary" />
          <h1 className="mt-4 text-xl font-semibold">Admin access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in from the admin panel to view earnings and payout reports.
          </p>
          <Button asChild className="mt-5 w-full">
            <Link to="/admin">Open admin panel</Link>
          </Button>
        </div>
      </div>
    );
  }

  const report = data.report as AdminEarningsReport;
  const visibleTransactions = useMemo(
    () => filterTransactions(report.transactions, transactionQuery, reportPeriod, transactionStatus),
    [report.transactions, transactionQuery, reportPeriod, transactionStatus],
  );
  const visiblePayouts = useMemo(
    () => filterPayouts(report.payouts, payoutQuery, reportPeriod, payoutStatus),
    [report.payouts, payoutQuery, reportPeriod, payoutStatus],
  );
  const visibleProfessionals = useMemo(
    () => filterProfessionals(report.professionals, professionalQuery),
    [report.professionals, professionalQuery],
  );
  const displayName = `${data.viewer.firstName} ${data.viewer.lastName}`.trim() || data.viewer.email;

  async function handlePayoutStatus(payout: AdminPayoutRecord, status: PayoutStatus) {
    setPendingPayoutId(payout.id);

    try {
      await updatePayoutReviewStatus({ data: { payoutId: payout.id, status } });
      await router.invalidate();
    } finally {
      setPendingPayoutId(null);
    }
  }

  return (
    <AppShell userName={displayName} userRole="Admin" userAvatarUrl={data.viewer.avatarUrl}>
      <div className="mb-6 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-primary">Admin panel</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Earnings, Commission & Payout Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete database view of project payments, Servio commission, net payable balances, and payout requests.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" type="button" onClick={() => downloadCsv(report)}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin">Back to admin</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard icon={CircleDollarSign} label="Gross earnings" value={formatMoney(report.totals.grossEarnings)} caption={`${report.totals.transactionCount} transaction records`} active={summaryResult === "transactions"} onClick={() => setSummaryResult("transactions")} />
        <SummaryCard icon={Percent} label="Commission" value={formatMoney(report.totals.commissionAmount)} caption={`${Math.round(report.commissionRate * 100)}% platform share`} active={summaryResult === "transactions"} onClick={() => setSummaryResult("transactions")} />
        <SummaryCard icon={Wallet} label="Net payable" value={formatMoney(report.totals.netEarnings)} caption="After commission" active={summaryResult === "transactions"} onClick={() => setSummaryResult("transactions")} />
        <SummaryCard icon={ArrowDownToLine} label="Requested payouts" value={formatMoney(report.totals.requestedPayouts)} caption={`${report.totals.payoutCount} payout records`} active={summaryResult === "payouts"} onClick={() => setSummaryResult("payouts")} />
        <SummaryCard icon={BadgeDollarSign} label="Available balance" value={formatMoney(report.totals.availableBalance)} caption="Net minus non-rejected payouts" active={summaryResult === "balances"} onClick={() => setSummaryResult("balances")} />
      </div>

      {summaryResult ? (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          <span className="font-medium">Showing {summaryResult === "balances" ? "professional balances" : summaryResult}</span>
          <Button type="button" size="sm" variant="outline" onClick={() => setSummaryResult(null)}>Show all</Button>
        </div>
      ) : null}

      <ReportControls
        period={reportPeriod}
        transactionStatus={transactionStatus}
        payoutStatus={payoutStatus}
        onPeriodChange={setReportPeriod}
        onTransactionStatusChange={setTransactionStatus}
        onPayoutStatusChange={setPayoutStatus}
        onReset={() => {
          setReportPeriod("ALL");
          setTransactionStatus("ALL");
          setPayoutStatus("ALL");
          setTransactionQuery("");
          setPayoutQuery("");
          setProfessionalQuery("");
        }}
      />

      <FinanceOverview report={report} />

      <div className="mt-6 grid gap-5">
        {(!summaryResult || summaryResult === "balances") && <ProfessionalSummarySection
          professionals={visibleProfessionals}
          query={professionalQuery}
          onQueryChange={setProfessionalQuery}
        />}
        {(!summaryResult || summaryResult === "payouts") && <PayoutSection
          payouts={visiblePayouts}
          query={payoutQuery}
          pendingPayoutId={pendingPayoutId}
          onQueryChange={setPayoutQuery}
          onStatusChange={handlePayoutStatus}
        />}
        {(!summaryResult || summaryResult === "transactions") && <TransactionSection
          transactions={visibleTransactions}
          query={transactionQuery}
          onQueryChange={setTransactionQuery}
        />}
      </div>
    </AppShell>
  );
}

function ReportControls({
  period,
  transactionStatus,
  payoutStatus,
  onPeriodChange,
  onTransactionStatusChange,
  onPayoutStatusChange,
  onReset,
}: {
  period: ReportPeriod;
  transactionStatus: string;
  payoutStatus: string;
  onPeriodChange: (value: ReportPeriod) => void;
  onTransactionStatusChange: (value: string) => void;
  onPayoutStatusChange: (value: string) => void;
  onReset: () => void;
}) {
  return (
    <section className="mt-5 rounded-xl border border-border bg-card p-4 shadow-soft">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Report filters</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Narrow transaction and payout records without changing lifetime balance totals.
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onReset}>
          Reset filters
        </Button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <FilterSelect
          label="Reporting period"
          value={period}
          values={["ALL", "30_DAYS", "90_DAYS", "THIS_YEAR"]}
          onChange={(value) => onPeriodChange(value as ReportPeriod)}
        />
        <FilterSelect
          label="Transaction status"
          value={transactionStatus}
          values={["ALL", "COMPLETED", "CANCELLED"]}
          onChange={onTransactionStatusChange}
        />
        <FilterSelect
          label="Payout status"
          value={payoutStatus}
          values={["ALL", "PENDING", "PROCESSING", "COMPLETED", "REJECTED"]}
          onChange={onPayoutStatusChange}
        />
      </div>
    </section>
  );
}

function FinanceOverview({ report }: { report: AdminEarningsReport }) {
  const payoutLiability = report.totals.availableBalance + report.totals.pendingPayouts;
  const reconciledNet =
    report.totals.paidPayouts + report.totals.pendingPayouts + report.totals.availableBalance;
  const reconciliationDifference = Math.abs(report.totals.netEarnings - reconciledNet);
  const isBalanced = reconciliationDifference < 0.01;

  return (
    <section className="mt-5 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
      <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Payout pipeline</h2>
            <p className="text-sm text-muted-foreground">Current movement of professional funds.</p>
          </div>
          <Landmark className="h-5 w-5 text-primary" />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <PipelineMetric label="Paid out" value={report.totals.paidPayouts} />
          <PipelineMetric label="Pending" value={report.totals.pendingPayouts} />
          <PipelineMetric label="Processing" value={report.totals.processingPayouts} />
          <PipelineMetric label="Rejected" value={report.totals.rejectedPayouts} />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/50 p-3 text-sm">
          <span className="text-muted-foreground">Outstanding professional liability</span>
          <span className="font-semibold">{formatMoney(payoutLiability)}</span>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Finance reconciliation</h2>
            <p className="text-sm text-muted-foreground">Checks net earnings against paid, queued, and available funds.</p>
          </div>
          {isBalanced ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-destructive" />
          )}
        </div>
        <div className="mt-5 space-y-3">
          <ReconciliationRow label="Net professional earnings" value={report.totals.netEarnings} />
          <ReconciliationRow label="Reconciled funds" value={reconciledNet} />
          <ReconciliationRow label="Difference" value={reconciliationDifference} strong />
        </div>
        <Badge className="mt-4" variant={isBalanced ? "default" : "destructive"}>
          {isBalanced ? "Balances reconcile" : "Review required"}
        </Badge>
      </div>
    </section>
  );
}

function PipelineMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{formatMoney(value)}</p>
    </div>
  );
}

function ReconciliationRow({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold" : "font-medium"}>{formatMoney(value)}</span>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {values.map((option) => (
            <SelectItem key={option} value={option}>
              {formatEnum(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

function ProfessionalSummarySection({
  professionals,
  query,
  onQueryChange,
}: {
  professionals: AdminProfessionalEarningsSummary[];
  query: string;
  onQueryChange: (value: string) => void;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <SectionHeader
        icon={UserRound}
        title="Professional balances"
        description="Per-professional gross earnings, commission, payout movement, and remaining payable balance."
        query={query}
        placeholder="Search professionals..."
        onQueryChange={onQueryChange}
      />
      <ResponsiveTable
        hasRows={professionals.length > 0}
        emptyTitle="No professional earnings found"
        emptyDescription="Completed project transactions and payout requests will appear here."
      >
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <th className="py-3 pr-4 font-medium">Professional</th>
            <th className="py-3 pr-4 text-right font-medium">Gross</th>
            <th className="py-3 pr-4 text-right font-medium">Commission</th>
            <th className="py-3 pr-4 text-right font-medium">Net</th>
            <th className="py-3 pr-4 text-right font-medium">Requested</th>
            <th className="py-3 pr-4 text-right font-medium">Paid</th>
            <th className="py-3 text-right font-medium">Available</th>
          </tr>
        </thead>
        <tbody>
          {professionals.map((professional) => (
            <tr key={professional.professionalId} className="border-b border-border/60 last:border-0">
              <td className="py-3 pr-4">
                <p className="font-medium">{professional.professionalName}</p>
                <p className="text-xs text-muted-foreground">{professional.professionalEmail}</p>
                <p className="text-xs text-muted-foreground">
                  {professional.transactionCount} transactions / {professional.payoutCount} payouts
                </p>
                {professional.pendingPayouts > 0 || professional.availableBalance > 0 ? (
                  <Badge variant="outline" className="mt-1">
                    Actionable balance
                  </Badge>
                ) : null}
              </td>
              <MoneyCell value={professional.grossEarnings} />
              <MoneyCell value={professional.commissionAmount} tone="danger" />
              <MoneyCell value={professional.netEarnings} />
              <MoneyCell value={professional.requestedPayouts} />
              <MoneyCell value={professional.paidPayouts} />
              <MoneyCell value={professional.availableBalance} strong />
            </tr>
          ))}
        </tbody>
      </ResponsiveTable>
    </section>
  );
}

function PayoutSection({
  payouts,
  query,
  pendingPayoutId,
  onQueryChange,
  onStatusChange,
}: {
  payouts: AdminPayoutRecord[];
  query: string;
  pendingPayoutId: number | null;
  onQueryChange: (value: string) => void;
  onStatusChange: (payout: AdminPayoutRecord, status: PayoutStatus) => void;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <SectionHeader
        icon={ArrowDownToLine}
        title="Payout requests"
        description="All bank, UPI, and wallet withdrawal requests with admin status control."
        query={query}
        placeholder="Search payouts..."
        onQueryChange={onQueryChange}
      />
      <div className="divide-y divide-border rounded-lg border border-border">
        {payouts.length ? (
          payouts.map((payout) => (
            <article key={payout.id} className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{payout.professionalName}</p>
                  <Badge variant={getPayoutStatusVariant(payout.status)}>{formatEnum(payout.status)}</Badge>
                  <Badge variant="outline">{formatEnum(payout.destinationType)}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{payout.professionalEmail}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Destination: <span className="font-medium text-foreground">{payout.destinationLabel}</span>
                </p>
                {payout.note ? <p className="mt-1 text-sm text-muted-foreground">Note: {payout.note}</p> : null}
                <p className="mt-2 text-xs text-muted-foreground">
                  Requested {formatDateTime(payout.createdAt)} / Updated {formatDateTime(payout.updatedAt)}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-right text-lg font-semibold">{formatMoney(payout.amount)}</p>
                <Select
                  value={payout.status}
                  disabled={pendingPayoutId === payout.id}
                  onValueChange={(value) => onStatusChange(payout, value as PayoutStatus)}
                >
                  <SelectTrigger aria-label={`Update payout ${payout.id} status`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="PROCESSING">Processing</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                {pendingPayoutId === payout.id ? <p className="text-xs text-muted-foreground">Saving payout...</p> : null}
              </div>
            </article>
          ))
        ) : (
          <EmptyState title="No payout requests found" description="Professional withdrawal requests will appear here." />
        )}
      </div>
    </section>
  );
}

function TransactionSection({
  transactions,
  query,
  onQueryChange,
}: {
  transactions: AdminEarningsTransactionRecord[];
  query: string;
  onQueryChange: (value: string) => void;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <SectionHeader
        icon={ReceiptText}
        title="All transaction records"
        description="Every project payment row with gross amount, commission deduction, and net payout calculation."
        query={query}
        placeholder="Search transactions..."
        onQueryChange={onQueryChange}
      />
      <ResponsiveTable
        hasRows={transactions.length > 0}
        emptyTitle="No transactions found"
        emptyDescription="Completed project payment rows will appear here."
      >
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <th className="py-3 pr-4 font-medium">Project</th>
            <th className="py-3 pr-4 font-medium">Parties</th>
            <th className="py-3 pr-4 font-medium">Type</th>
            <th className="py-3 pr-4 text-right font-medium">Gross</th>
            <th className="py-3 pr-4 text-right font-medium">Commission</th>
            <th className="py-3 pr-4 text-right font-medium">Net</th>
            <th className="py-3 text-right font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction.id} className="border-b border-border/60 last:border-0">
              <td className="py-3 pr-4">
                <p className="font-medium">{transaction.jobTitle}</p>
                <p className="text-xs text-muted-foreground">{transaction.projectCategory}</p>
                <p className="text-xs text-muted-foreground">Tracking #{transaction.trackingId}</p>
              </td>
              <td className="py-3 pr-4 text-sm">
                <p>{transaction.clientName}</p>
                <p className="text-muted-foreground">{transaction.professionalName}</p>
              </td>
              <td className="py-3 pr-4">
                <Badge variant={transaction.status === "COMPLETED" ? "default" : "outline"}>
                  {formatEnum(transaction.status)}
                </Badge>
                <p className="mt-1 text-xs text-muted-foreground">{formatEnum(transaction.paymentType)}</p>
              </td>
              <MoneyCell value={transaction.amount} />
              <MoneyCell value={transaction.commissionAmount} tone="danger" />
              <MoneyCell value={transaction.netPayoutAmount} strong />
              <td className="py-3 text-right text-sm text-muted-foreground">{formatDate(transaction.dateTime)}</td>
            </tr>
          ))}
        </tbody>
      </ResponsiveTable>
    </section>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
  query,
  placeholder,
  onQueryChange,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  query: string;
  placeholder: string;
  onQueryChange: (value: string) => void;
}) {
  return (
    <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
      <div className="flex gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="relative w-full lg:max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={placeholder} className="pl-9" />
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  caption,
  active,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  caption: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={`rounded-lg border bg-card p-4 text-left shadow-soft transition-colors hover:border-primary/40 hover:bg-muted/30 ${active ? "border-primary bg-primary/5" : "border-border"}`}>
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-3 text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{caption}</p>
    </button>
  );
}

function ResponsiveTable({
  children,
  hasRows,
  emptyTitle,
  emptyDescription,
}: {
  children: ReactNode;
  hasRows: boolean;
  emptyTitle: string;
  emptyDescription: string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      {hasRows ? <table className="w-full min-w-[920px] text-sm">{children}</table> : null}
      {!hasRows ? <EmptyState title={emptyTitle} description={emptyDescription} /> : null}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-6 text-center text-sm text-muted-foreground">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1">{description}</p>
    </div>
  );
}

function MoneyCell({ value, tone, strong }: { value: number; tone?: "danger"; strong?: boolean }) {
  return (
    <td className={`py-3 pr-4 text-right ${strong ? "font-semibold" : ""} ${tone === "danger" ? "text-destructive" : ""}`}>
      {tone === "danger" && value > 0 ? "-" : ""}
      {formatMoney(value)}
    </td>
  );
}

function filterTransactions(
  transactions: AdminEarningsTransactionRecord[],
  query: string,
  period: ReportPeriod,
  status: string,
) {
  const term = query.trim().toLowerCase();

  return transactions.filter((transaction) => {
    if (!isInReportPeriod(transaction.dateTime, period)) return false;
    if (status !== "ALL" && transaction.status !== status) return false;
    if (!term) return true;

    return [
        transaction.jobTitle,
        transaction.projectCategory,
        transaction.clientName,
        transaction.clientEmail,
        transaction.professionalName,
        transaction.professionalEmail,
        transaction.paymentType,
        transaction.status,
        transaction.description,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
  });
}

function filterPayouts(
  payouts: AdminPayoutRecord[],
  query: string,
  period: ReportPeriod,
  status: string,
) {
  const term = query.trim().toLowerCase();

  return payouts.filter((payout) => {
    if (!isInReportPeriod(payout.createdAt, period)) return false;
    if (status !== "ALL" && payout.status !== status) return false;
    if (!term) return true;

    return [
        payout.professionalName,
        payout.professionalEmail,
        payout.destinationType,
        payout.destinationLabel,
        payout.status,
        payout.note,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
  });
}

function isInReportPeriod(value: string, period: ReportPeriod) {
  if (period === "ALL") return true;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  if (period === "THIS_YEAR") return date.getFullYear() === now.getFullYear();

  const days = period === "30_DAYS" ? 30 : 90;
  return date.getTime() >= now.getTime() - days * 24 * 60 * 60 * 1000;
}

function filterProfessionals(professionals: AdminProfessionalEarningsSummary[], query: string) {
  const term = query.trim().toLowerCase();

  if (!term) {
    return professionals;
  }

  return professionals.filter((professional) =>
    [professional.professionalName, professional.professionalEmail].join(" ").toLowerCase().includes(term),
  );
}

function getPayoutStatusVariant(status: string) {
  if (status === "COMPLETED") {
    return "default";
  }

  if (status === "REJECTED") {
    return "destructive";
  }

  if (status === "PROCESSING") {
    return "secondary";
  }

  return "outline";
}

function downloadCsv(report: AdminEarningsReport) {
  const rows = [
    ["Report", "Generated At", report.generatedAt],
    ["Totals", "Gross", report.totals.grossEarnings],
    ["Totals", "Commission", report.totals.commissionAmount],
    ["Totals", "Net", report.totals.netEarnings],
    [],
    ["Transactions"],
    ["ID", "Project", "Client", "Professional", "Type", "Status", "Gross", "Commission", "Net", "Date"],
    ...report.transactions.map((transaction) => [
      transaction.id,
      transaction.jobTitle,
      transaction.clientName,
      transaction.professionalName,
      transaction.paymentType,
      transaction.status,
      transaction.amount,
      transaction.commissionAmount,
      transaction.netPayoutAmount,
      transaction.dateTime,
    ]),
    [],
    ["Payouts"],
    ["ID", "Professional", "Method", "Destination", "Status", "Amount", "Created", "Updated"],
    ...report.payouts.map((payout) => [
      payout.id,
      payout.professionalName,
      payout.destinationType,
      payout.destinationLabel,
      payout.status,
      payout.amount,
      payout.createdAt,
      payout.updatedAt,
    ]),
  ];
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `servio-earnings-payout-report-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function formatMoney(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

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

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not set";
  }

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

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
