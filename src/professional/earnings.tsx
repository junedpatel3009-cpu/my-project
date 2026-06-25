import type { ComponentType } from "react";
import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
  ArrowDownToLine,
  CheckCircle2,
  Clock3,
  DollarSign,
  Percent,
  ReceiptText,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCurrentUser } from "@/lib/current-user.server";
import {
  createProfessionalWithdrawalRequest,
  getProfessionalWithdrawals,
  getUserProjectTransactions,
  type ProjectTransactionRecord,
  type ProjectWithdrawalDestinationType,
  type ProjectWithdrawalRecord,
} from "@/lib/project-request-db.server";

const getEarningsData = createServerFn({ method: "GET" }).handler(async () => {
  const viewer = getCurrentUser();

  if (!viewer) {
    return {
      viewer: null,
      transactions: [] as ProjectTransactionRecord[],
      withdrawals: [] as ProjectWithdrawalRecord[],
    };
  }

  return {
    viewer,
    transactions: getUserProjectTransactions(viewer.id),
    withdrawals: viewer.role === "PROFESSIONAL" ? getProfessionalWithdrawals(viewer.id) : [],
  };
});

const requestWithdrawal = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      amount: number;
      destinationType: ProjectWithdrawalDestinationType;
      destinationLabel: string;
      note?: string | null;
    }) => input,
  )
  .handler(async ({ data }) => {
    const viewer = getCurrentUser();

    if (!viewer || viewer.role !== "PROFESSIONAL") {
      throw new Error("Only professionals can request withdrawals.");
    }

    return createProfessionalWithdrawalRequest(viewer.id, data);
  });

export const Route = createFileRoute("/earnings")({
  loader: async () => getEarningsData(),
  head: () => ({ meta: [{ title: "Earnings - Servio" }] }),
  component: Earnings,
});

function Earnings() {
  const { viewer, transactions, withdrawals } = Route.useLoaderData();
  const router = useRouter();
  const isProfessional = viewer?.role === "PROFESSIONAL";
  const viewerName = viewer ? `${viewer.firstName} ${viewer.lastName}`.trim() : undefined;
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState<ProjectWithdrawalDestinationType>("BANK");
  const [withdrawDestination, setWithdrawDestination] = useState("");
  const [withdrawNote, setWithdrawNote] = useState("");
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawMessage, setWithdrawMessage] = useState<string | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const scopedTransactions = transactions.filter((transaction) =>
    isProfessional
      ? transaction.professionalId === viewer?.id
      : transaction.clientId === viewer?.id,
  );
  const scopedWithdrawals = isProfessional ? withdrawals : [];
  const completedTransactions = scopedTransactions.filter(
    (transaction) => transaction.status === "COMPLETED",
  );
  const cancelledTransactions = scopedTransactions.filter(
    (transaction) => transaction.status === "CANCELLED",
  );
  const lifetimeTotal = completedTransactions.reduce(
    (total, transaction) => total + transaction.amount,
    0,
  );
  const thisMonthTotal = completedTransactions
    .filter((transaction) => isSameMonth(transaction.createdAt, new Date()))
    .reduce((total, transaction) => total + transaction.amount, 0);
  const completedJobs = getCompletedJobs(completedTransactions);
  const pendingPayouts = completedTransactions;
  const invoices = completedTransactions.map((transaction) => createInvoiceRecord(transaction));
  const totalCommission = invoices.reduce((total, invoice) => total + invoice.commission, 0);
  const totalNetPayout = invoices.reduce((total, invoice) => total + invoice.netPayout, 0);
  const requestedWithdrawals = scopedWithdrawals
    .filter((withdrawal) => withdrawal.status !== "REJECTED")
    .reduce((total, withdrawal) => total + withdrawal.amount, 0);
  const availableBalance = Math.max(0, totalNetPayout - requestedWithdrawals);
  const chartData = getMonthlyTotals(completedTransactions);
  const max = Math.max(1, ...chartData.map((d) => d.value));

  async function handleWithdrawalRequest() {
    const amount = Number(withdrawAmount);

    setIsWithdrawing(true);
    setWithdrawError(null);
    setWithdrawMessage(null);

    try {
      await requestWithdrawal({
        data: {
          amount,
          destinationType: withdrawMethod,
          destinationLabel: withdrawDestination,
          note: withdrawNote,
        },
      });
      setWithdrawMessage("Withdrawal request submitted. It is now pending review.");
      setIsWithdrawOpen(false);
      setWithdrawAmount("");
      setWithdrawDestination("");
      setWithdrawNote("");
      await router.invalidate();
    } catch (error) {
      setWithdrawError(
        error instanceof Error ? error.message : "Could not submit withdrawal request.",
      );
    } finally {
      setIsWithdrawing(false);
    }
  }

  return (
    <AppShell
      title={isProfessional ? "View Earnings Dashboard" : "Payments"}
      userName={viewerName}
      userRole={isProfessional ? "Professional" : "Client"}
      userAvatarUrl={viewer?.avatarUrl}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={Wallet}
          tint="text-primary bg-primary/10"
          label={isProfessional ? "Available balance" : "Total paid"}
          value={formatMoney(isProfessional ? availableBalance : lifetimeTotal)}
          sub={isProfessional ? "Ready to withdraw" : "Saved in transactions"}
        />
        <Stat
          icon={TrendingUp}
          tint="text-success bg-success/15"
          label="This month"
          value={formatMoney(thisMonthTotal)}
          sub="Completed payments"
        />
        <Stat
          icon={DollarSign}
          tint="text-accent bg-accent/15"
          label="Completed"
          value={String(completedTransactions.length)}
          sub="Ledger rows"
        />
        <Stat
          icon={ArrowDownToLine}
          tint="text-warning bg-warning/15"
          label="Cancelled"
          value={String(cancelledTransactions.length)}
          sub="Voided rows"
        />
      </div>

      {isProfessional ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">View Completed Jobs</h2>
                <p className="text-sm text-muted-foreground">
                  Projects counted only after completed payment records exist.
                </p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div className="mt-4 space-y-3">
              {completedJobs.map((job) => (
                <div
                  key={job.trackingId}
                  className="rounded-xl border border-border bg-background p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="line-clamp-1 font-medium">
                        {job.projectTitle || "Completed project"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {job.projectCategory || "Project"} - {job.paymentCount} payment rows
                      </p>
                    </div>
                    <span className="font-semibold">{formatMoney(job.amount)}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Last paid {formatDate(job.lastPaidAt)}
                  </p>
                </div>
              ))}
              {!completedJobs.length ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-muted-foreground" />
                  <h3 className="mt-3 font-semibold">No completed jobs yet</h3>
                  <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                    Completed jobs will appear here after the client approves work or pays
                    milestones.
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Pending Payouts</h2>
                <p className="text-sm text-muted-foreground">
                  Completed earnings waiting for withdrawal.
                </p>
              </div>
              <Clock3 className="h-5 w-5 text-warning" />
            </div>
            <p className="mt-5 text-3xl font-semibold">{formatMoney(lifetimeTotal)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatMoney(availableBalance)} available after commission and withdrawal requests
            </p>
            <div className="mt-5 space-y-3">
              {pendingPayouts.slice(0, 4).map((payout) => (
                <div
                  key={payout.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate">
                    {payout.projectTitle || payout.description}
                  </span>
                  <span className="font-medium">{formatMoney(payout.amount)}</span>
                </div>
              ))}
              {!pendingPayouts.length ? (
                <p className="rounded-lg bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
                  No pending payouts yet.
                </p>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {isProfessional ? (
        <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold">View Invoices & Commission Deduction</h2>
              <p className="text-sm text-muted-foreground">
                Invoice totals from completed payments with Servio commission shown separately.
              </p>
            </div>
            <ReceiptText className="h-5 w-5 text-primary" />
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <MiniStat
              label="Gross invoices"
              value={formatMoney(lifetimeTotal)}
              icon={ReceiptText}
            />
            <MiniStat
              label="Commission deduction"
              value={formatMoney(totalCommission)}
              icon={Percent}
            />
            <MiniStat label="Net payout" value={formatMoney(totalNetPayout)} icon={Wallet} />
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-3 pr-4 font-medium">Invoice</th>
                  <th className="py-3 pr-4 font-medium">Project</th>
                  <th className="py-3 pr-4 font-medium">Date</th>
                  <th className="py-3 pr-4 text-right font-medium">Gross</th>
                  <th className="py-3 pr-4 text-right font-medium">Commission</th>
                  <th className="py-3 text-right font-medium">Net payout</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="border-b border-border/60 last:border-0 hover:bg-muted/40"
                  >
                    <td className="py-3 pr-4 font-medium">{invoice.invoiceNumber}</td>
                    <td className="py-3 pr-4">{invoice.projectTitle}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatDate(invoice.createdAt)}
                    </td>
                    <td className="py-3 pr-4 text-right">{formatMoney(invoice.gross)}</td>
                    <td className="py-3 pr-4 text-right text-destructive">
                      -{formatMoney(invoice.commission)}
                    </td>
                    <td className="py-3 text-right font-semibold">
                      {formatMoney(invoice.netPayout)}
                    </td>
                  </tr>
                ))}
                {!invoices.length ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No invoices yet. Completed project payments will create invoice rows here.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {isProfessional ? "Earnings" : "Payments"} by month
            </h2>
            <span className="text-sm text-muted-foreground">Last 6 months</span>
          </div>
          <div className="mt-4 flex h-56 items-end gap-3">
            {chartData.map((d) => (
              <div key={d.month} className="group flex flex-1 flex-col items-center gap-2">
                <div className="relative w-full">
                  <div
                    className="w-full rounded-t-lg gradient-primary transition-all group-hover:opacity-90"
                    style={{ height: `${Math.max(4, (d.value / max) * 200)}px` }}
                  />
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 rounded bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background opacity-0 group-hover:opacity-100">
                    {formatMoney(d.value)}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{d.month}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl gradient-primary p-6 text-white shadow-elevated">
          <p className="text-sm opacity-80">
            {isProfessional ? "Wallet balance" : "Project payments"}
          </p>
          <p className="mt-2 text-4xl font-bold">
            {formatMoney(isProfessional ? availableBalance : lifetimeTotal)}
          </p>
          <p className="mt-1 text-xs opacity-80">
            {isProfessional ? "Net payout minus requested withdrawals" : "Loaded from the database"}
          </p>
          <Button
            className="mt-6 w-full bg-white/15 text-white hover:bg-white/25"
            disabled={!isProfessional || availableBalance <= 0}
            onClick={() => {
              setWithdrawAmount(String(Math.floor(availableBalance)));
              setWithdrawError(null);
              setWithdrawMessage(null);
              setIsWithdrawOpen(true);
            }}
          >
            <ArrowDownToLine className="mr-2 h-4 w-4" /> Withdraw to bank
          </Button>
          <div className="mt-6 space-y-2 border-t border-white/20 pt-5 text-sm">
            <div className="flex justify-between">
              <span className="opacity-80">Currency</span>
              <span>USD</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-80">Source</span>
              <span>Project milestones</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-80">Rows</span>
              <span>{scopedTransactions.length}</span>
            </div>
            {isProfessional ? (
              <div className="flex justify-between">
                <span className="opacity-80">Requested</span>
                <span>{formatMoney(requestedWithdrawals)}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {isProfessional ? (
        <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold">Withdrawal requests</h2>
              <p className="text-sm text-muted-foreground">
                Track bank, UPI, and wallet payout requests.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setWithdrawAmount(String(Math.floor(availableBalance)));
                setWithdrawError(null);
                setWithdrawMessage(null);
                setIsWithdrawOpen(true);
              }}
              disabled={availableBalance <= 0}
            >
              <ArrowDownToLine className="h-4 w-4" />
              Withdraw money
            </Button>
          </div>

          {withdrawMessage ? (
            <p className="mt-4 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">
              {withdrawMessage}
            </p>
          ) : null}

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-3 pr-4 font-medium">Date</th>
                  <th className="py-3 pr-4 font-medium">Method</th>
                  <th className="py-3 pr-4 font-medium">Destination</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {scopedWithdrawals.map((withdrawal) => (
                  <tr
                    key={withdrawal.id}
                    className="border-b border-border/60 last:border-0 hover:bg-muted/40"
                  >
                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatDate(withdrawal.createdAt)}
                    </td>
                    <td className="py-3 pr-4">{formatEnum(withdrawal.destinationType)}</td>
                    <td className="py-3 pr-4">{withdrawal.destinationLabel}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatEnum(withdrawal.status)}
                    </td>
                    <td className="py-3 text-right font-medium">
                      {formatMoney(withdrawal.amount)}
                    </td>
                  </tr>
                ))}
                {!scopedWithdrawals.length ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No withdrawal requests yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Transactions</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadTransactionsPdf(scopedTransactions, isProfessional)}
            disabled={!scopedTransactions.length}
          >
            <ReceiptText className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-3 pr-4 font-medium">Date</th>
                <th className="py-3 pr-4 font-medium">Description</th>
                <th className="py-3 pr-4 font-medium">Type</th>
                <th className="py-3 pr-4 font-medium">Status</th>
                <th className="py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {scopedTransactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  className="border-b border-border/60 last:border-0 hover:bg-muted/40"
                >
                  <td className="py-3 pr-4 text-muted-foreground">
                    {formatDate(transaction.createdAt)}
                  </td>
                  <td className="py-3 pr-4">{transaction.description}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        transaction.type === "MILESTONE_PAYMENT"
                          ? "bg-success/15 text-success"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {formatTransactionType(transaction.type)}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {formatEnum(transaction.status)}
                  </td>
                  <td className="py-3 text-right font-medium">{formatMoney(transaction.amount)}</td>
                </tr>
              ))}
              {!scopedTransactions.length ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    No transactions saved yet. Mark a project milestone as paid to create the first
                    record.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw money</DialogTitle>
            <DialogDescription>
              Request a payout from your available balance of {formatMoney(availableBalance)}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="withdraw-amount">Amount</Label>
                <Input
                  id="withdraw-amount"
                  type="number"
                  min={1}
                  max={Math.floor(availableBalance)}
                  value={withdrawAmount}
                  onChange={(event) => setWithdrawAmount(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Method</Label>
                <Select
                  value={withdrawMethod}
                  onValueChange={(value) =>
                    setWithdrawMethod(value as ProjectWithdrawalDestinationType)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BANK">Bank transfer</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="WALLET">Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="withdraw-destination">Payout details</Label>
              <Input
                id="withdraw-destination"
                value={withdrawDestination}
                onChange={(event) => setWithdrawDestination(event.target.value)}
                placeholder={
                  withdrawMethod === "UPI"
                    ? "name@upi"
                    : withdrawMethod === "WALLET"
                      ? "Wallet ID or phone"
                      : "Bank name, account, IFSC/routing"
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="withdraw-note">Note</Label>
              <Input
                id="withdraw-note"
                value={withdrawNote}
                onChange={(event) => setWithdrawNote(event.target.value)}
                placeholder="Optional note for admin"
              />
            </div>
            {withdrawError ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {withdrawError}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsWithdrawOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleWithdrawalRequest}
              disabled={isWithdrawing || availableBalance <= 0}
            >
              <ArrowDownToLine className="h-4 w-4" />
              {isWithdrawing ? "Submitting" : "Submit request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function getMonthlyTotals(transactions: ProjectTransactionRecord[]) {
  const now = new Date();

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const value = transactions
      .filter((transaction) => {
        const transactionDate = new Date(transaction.createdAt);
        return (
          transactionDate.getFullYear() === date.getFullYear() &&
          transactionDate.getMonth() === date.getMonth()
        );
      })
      .reduce((total, transaction) => total + transaction.amount, 0);

    return {
      month: new Intl.DateTimeFormat("en", { month: "short" }).format(date),
      value,
    };
  });
}

function getCompletedJobs(transactions: ProjectTransactionRecord[]) {
  const jobs = new Map<
    number,
    {
      trackingId: number;
      projectTitle: string | null;
      projectCategory: string | null;
      amount: number;
      paymentCount: number;
      lastPaidAt: string;
    }
  >();

  transactions.forEach((transaction) => {
    const existing = jobs.get(transaction.trackingId);

    if (!existing) {
      jobs.set(transaction.trackingId, {
        trackingId: transaction.trackingId,
        projectTitle: transaction.projectTitle,
        projectCategory: transaction.projectCategory,
        amount: transaction.amount,
        paymentCount: 1,
        lastPaidAt: transaction.createdAt,
      });
      return;
    }

    existing.amount += transaction.amount;
    existing.paymentCount += 1;

    if (new Date(transaction.createdAt).getTime() > new Date(existing.lastPaidAt).getTime()) {
      existing.lastPaidAt = transaction.createdAt;
    }
  });

  return Array.from(jobs.values()).sort(
    (a, b) => new Date(b.lastPaidAt).getTime() - new Date(a.lastPaidAt).getTime(),
  );
}

function createInvoiceRecord(transaction: ProjectTransactionRecord) {
  const commission = Math.round(transaction.amount * 0.1 * 100) / 100;

  return {
    id: transaction.id,
    invoiceNumber: `INV-${String(transaction.id).padStart(5, "0")}`,
    projectTitle: transaction.projectTitle || transaction.description || "Project payment",
    createdAt: transaction.createdAt,
    gross: transaction.amount,
    commission,
    netPayout: Math.max(0, transaction.amount - commission),
  };
}

function downloadTransactionsPdf(
  transactions: ProjectTransactionRecord[],
  includeCommission: boolean,
) {
  const headers = includeCommission
    ? [
        "Date",
        "Project",
        "Description",
        "Type",
        "Status",
        "Gross Amount",
        "Commission Deduction",
        "Net Payout",
        "Currency",
      ]
    : ["Date", "Project", "Description", "Type", "Status", "Amount", "Currency"];
  const rows = transactions.map((transaction) => {
    const invoice = createInvoiceRecord(transaction);

    return includeCommission
      ? [
          formatDate(transaction.createdAt),
          transaction.projectTitle || "",
          transaction.description,
          formatTransactionType(transaction.type),
          formatEnum(transaction.status),
          transaction.amount,
          invoice.commission,
          invoice.netPayout,
          transaction.currency,
        ]
      : [
          formatDate(transaction.createdAt),
          transaction.projectTitle || "",
          transaction.description,
          formatTransactionType(transaction.type),
          formatEnum(transaction.status),
          transaction.amount,
          transaction.currency,
        ];
  });
  const title = includeCommission ? "Servio Professional Earnings" : "Servio Client Payments";
  const lines = [
    title,
    `Generated: ${formatDate(new Date().toISOString())}`,
    "",
    ...formatPdfTable(headers, rows),
  ];
  const blob = new Blob([createSimplePdf(lines)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = includeCommission
    ? `servio-professional-earnings-${date}.pdf`
    : `servio-client-payments-${date}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatPdfTable(headers: string[], rows: Array<Array<string | number>>) {
  const columnWidths = headers.map((header, index) =>
    Math.min(
      Math.max(header.length, ...rows.map((row) => String(row[index] ?? "").length)),
      index === 2 ? 28 : 18,
    ),
  );
  const formatRow = (row: Array<string | number>) =>
    row
      .map((cell, index) =>
        truncatePdfCell(String(cell ?? ""), columnWidths[index]).padEnd(columnWidths[index]),
      )
      .join("  ");

  return [
    formatRow(headers),
    columnWidths.map((width) => "-".repeat(width)).join("  "),
    ...rows.map(formatRow),
  ];
}

function truncatePdfCell(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1))}.`;
}

function createSimplePdf(lines: string[]) {
  const pageWidth = 842;
  const pageHeight = 595;
  const marginX = 36;
  const lineHeight = 13;
  const maxLinesPerPage = Math.floor((pageHeight - 72) / lineHeight);
  const pages = chunkLines(lines.length ? lines : ["No transactions available."], maxLinesPerPage);
  const objects: string[] = [];

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`,
  );

  pages.forEach((pageLines, index) => {
    const pageObjectId = 3 + index * 2;
    const contentObjectId = pageObjectId + 1;
    const stream = [
      "BT",
      "/F1 9 Tf",
      `${marginX} ${pageHeight - 36} Td`,
      ...pageLines
        .flatMap((line, lineIndex) => [
          lineIndex === 0 ? "" : `0 -${lineHeight} Td`,
          `(${escapePdfText(line)}) Tj`,
        ])
        .filter(Boolean),
      "ET",
    ].join("\n");

    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${3 + pages.length * 2} 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
    );
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });

  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>");

  const parts = ["%PDF-1.4\n"];
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(parts.join("").length);
    parts.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
  });

  const xrefOffset = parts.join("").length;
  parts.push(`xref\n0 ${objects.length + 1}\n`);
  parts.push("0000000000 65535 f \n");
  offsets.slice(1).forEach((offset) => {
    parts.push(`${String(offset).padStart(10, "0")} 00000 n \n`);
  });
  parts.push(
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`,
  );

  return parts.join("");
}

function chunkLines(lines: string[], size: number) {
  const chunks: string[][] = [];

  for (let index = 0; index < lines.length; index += size) {
    chunks.push(lines.slice(index, index + size));
  }

  return chunks.length ? chunks : [[""]];
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function isSameMonth(value: string, date: Date) {
  const transactionDate = new Date(value);

  return (
    transactionDate.getFullYear() === date.getFullYear() &&
    transactionDate.getMonth() === date.getMonth()
  );
}

function formatMoney(value: number) {
  return `$${value.toLocaleString()}`;
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

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTransactionType(value: string) {
  return value === "MILESTONE_PAYMENT" ? "Milestone" : "Final";
}

function Stat({
  icon: Icon,
  tint,
  label,
  value,
  sub,
}: {
  icon: ComponentType<{ className?: string }>;
  tint: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div className={`grid h-10 w-10 place-items-center rounded-xl ${tint}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-2xl font-semibold">{value}</p>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </div>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}
