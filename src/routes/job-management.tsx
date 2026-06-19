import { createServerFn } from "@tanstack/react-start";
import { createFileRoute, Link, useLoaderData, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  DollarSign,
  Eye,
  FileText,
  Filter,
  ListChecks,
  Mail,
  MapPin,
  Paperclip,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
  X,
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
  getAdminDashboardSnapshot,
  getAdminDisputeRecords,
  getAdminJobRecords,
  updateAdminDisputeStatus,
  type AdminDisputeRecord,
  type AdminJobRecord,
} from "@/lib/admin-dashboard-db.server";

type DisputeStatus = "OPEN" | "UNDER_REVIEW" | "RESOLVED";
type JobQuickFilter =
  | "TOTAL"
  | "PENDING"
  | "OPEN"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "DISPUTED";
type DisputeQuickFilter = "TOTAL" | "NEW" | "UNDER_REVIEW" | "WAITING_CUSTOMER" | "WAITING_PROVIDER" | "RESOLVED" | "CLOSED";

type JobFilters = {
  customer: string;
  provider: string;
  category: string;
  status: string;
  paymentStatus: string;
};

type DisputeFilters = {
  status: string;
  priority: string;
  customer: string;
  provider: string;
};

const getJobManagementData = createServerFn({ method: "GET" }).handler(async () => {
  const viewer = getCurrentUser();

  if (!viewer || viewer.role !== "ADMIN") {
    return {
      viewer,
      jobs: [],
      disputes: [],
      dashboard: null,
    };
  }

  return {
    viewer,
    jobs: getAdminJobRecords(),
    disputes: getAdminDisputeRecords(),
    dashboard: getAdminDashboardSnapshot(),
  };
});

const updateDisputeReviewStatus = createServerFn({ method: "POST" })
  .inputValidator((input: { disputeId: number; status: DisputeStatus }) => input)
  .handler(async ({ data }) => {
    const viewer = getCurrentUser();

    if (!viewer || viewer.role !== "ADMIN") {
      throw new Error("Only admins can update disputes.");
    }

    return updateAdminDisputeStatus(data.disputeId, data.status);
  });

export const Route = createFileRoute("/job-management")({
  loader: () => getJobManagementData(),
  head: () => ({ meta: [{ title: "Job & Dispute Management - Servio" }] }),
  component: JobManagement,
});

function JobManagement() {
  const data = useLoaderData({ from: "/job-management" });
  const router = useRouter();
  const [jobQuery, setJobQuery] = useState("");
  const [disputeQuery, setDisputeQuery] = useState("");
  const [jobQuickFilter, setJobQuickFilter] = useState<JobQuickFilter | null>(null);
  const [disputeQuickFilter, setDisputeQuickFilter] = useState<DisputeQuickFilter | null>(null);
  const [jobFilters, setJobFilters] = useState<JobFilters>({
    customer: "",
    provider: "",
    category: "ALL",
    status: "ALL",
    paymentStatus: "ALL",
  });
  const [disputeFilters, setDisputeFilters] = useState<DisputeFilters>({
    status: "ALL",
    priority: "ALL",
    customer: "",
    provider: "",
  });
  const [pendingDisputeId, setPendingDisputeId] = useState<number | null>(null);
  const [selectedJob, setSelectedJob] = useState<AdminJobRecord | null>(null);
  const [selectedDispute, setSelectedDispute] = useState<AdminDisputeRecord | null>(null);

  if (!data.viewer || data.viewer.role !== "ADMIN") {
    return (
      <div className="grid min-h-screen place-items-center bg-muted/30 px-4">
        <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 text-center shadow-soft">
          <ShieldCheck className="mx-auto h-8 w-8 text-primary" />
          <h1 className="mt-4 text-xl font-semibold">Admin access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in from the admin panel to manage jobs and disputes.
          </p>
          <Button asChild className="mt-5 w-full">
            <Link to="/admin">Open admin panel</Link>
          </Button>
        </div>
      </div>
    );
  }

  const jobs = data.jobs as AdminJobRecord[];
  const disputes = data.disputes as AdminDisputeRecord[];
  const visibleJobs = useMemo(
    () => filterJobs(jobs, disputes, jobQuery, jobFilters, jobQuickFilter),
    [jobs, disputes, jobQuery, jobFilters, jobQuickFilter],
  );
  const visibleDisputes = useMemo(
    () => filterDisputes(disputes, disputeQuery, disputeFilters, disputeQuickFilter),
    [disputes, disputeQuery, disputeFilters, disputeQuickFilter],
  );
  const displayName = `${data.viewer.firstName} ${data.viewer.lastName}`.trim() || data.viewer.email;
  const stats = getPageStats(jobs, disputes);
  const jobStatuses = useMemo(() => uniqueOptions(jobs.flatMap((job) => [job.status, job.trackingStatus].filter(Boolean) as string[])), [jobs]);

  async function handleDisputeStatus(dispute: AdminDisputeRecord, status: DisputeStatus) {
    setPendingDisputeId(dispute.id);

    try {
      await updateDisputeReviewStatus({ data: { disputeId: dispute.id, status } });
      await router.invalidate();
    } finally {
      setPendingDisputeId(null);
    }
  }

  return (
    <AppShell userName={displayName} userRole="Admin" userAvatarUrl={data.viewer.avatarUrl}>
      <div className="mb-6 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-primary">Admin panel</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Job & Dispute Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor posted jobs, assigned work, completion activity, and dispute resolution.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/admin">Back to admin</Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={BriefcaseBusiness} label="Total jobs" value={stats.totalJobs} caption={`${stats.openJobs} open jobs`} active={jobQuickFilter === "TOTAL"} onClick={() => setJobQuickFilter("TOTAL")} />
        <SummaryCard icon={ListChecks} label="Assigned jobs" value={stats.assignedJobs} caption={`${stats.inProgressJobs} in progress`} active={jobQuickFilter === "ASSIGNED"} onClick={() => setJobQuickFilter("ASSIGNED")} />
        <SummaryCard icon={AlertTriangle} label="Open disputes" value={stats.openDisputes} caption={`${stats.highPriorityDisputes} high priority`} active={disputeQuickFilter === "UNDER_REVIEW"} onClick={() => setDisputeQuickFilter("UNDER_REVIEW")} />
        <SummaryCard icon={CheckCircle2} label="Completed jobs" value={stats.completedJobs} caption={`${stats.resolvedDisputes} disputes resolved`} active={jobQuickFilter === "COMPLETED"} onClick={() => setJobQuickFilter("COMPLETED")} />
      </div>

      <div className="mt-6 space-y-6">
        <DisputeSection
          disputes={visibleDisputes}
          query={disputeQuery}
          filters={disputeFilters}
          activeQuickFilter={disputeQuickFilter}
          onQueryChange={setDisputeQuery}
          onFiltersChange={setDisputeFilters}
          onQuickFilterClear={() => setDisputeQuickFilter(null)}
          onOpenDispute={setSelectedDispute}
        />
        <JobSection
          jobs={visibleJobs}
          query={jobQuery}
          filters={jobFilters}
          statuses={jobStatuses}
          activeQuickFilter={jobQuickFilter}
          onQueryChange={setJobQuery}
          onFiltersChange={setJobFilters}
          onQuickFilterClear={() => setJobQuickFilter(null)}
          onOpenJob={setSelectedJob}
        />
      </div>
      {selectedJob ? <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} /> : null}
      {selectedDispute ? (
        <DisputeDetailModal
          dispute={selectedDispute}
          pending={pendingDisputeId === selectedDispute.id}
          onClose={() => setSelectedDispute(null)}
          onStatusChange={handleDisputeStatus}
        />
      ) : null}
    </AppShell>
  );
}

function DisputeSection({
  disputes,
  query,
  filters,
  activeQuickFilter,
  onQueryChange,
  onFiltersChange,
  onQuickFilterClear,
  onOpenDispute,
}: {
  disputes: AdminDisputeRecord[];
  query: string;
  filters: DisputeFilters;
  activeQuickFilter: DisputeQuickFilter | null;
  onQueryChange: (value: string) => void;
  onFiltersChange: (value: DisputeFilters) => void;
  onQuickFilterClear: () => void;
  onOpenDispute: (dispute: AdminDisputeRecord) => void;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-soft">
      <SectionHeader
        icon={AlertTriangle}
        title="Dispute queue"
        description="Review issue type, parties, priority, and resolution status."
        query={query}
        placeholder="Search disputes..."
        onQueryChange={onQueryChange}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <FilterSelect label="Status" value={filters.status} values={["ALL", "OPEN", "UNDER_REVIEW", "RESOLVED"]} onChange={(value) => onFiltersChange({ ...filters, status: value })} />
        <FilterSelect label="Priority" value={filters.priority} values={["ALL", "HIGH", "MEDIUM", "LOW"]} onChange={(value) => onFiltersChange({ ...filters, priority: value })} />
      </div>
      {activeQuickFilter ? <ActiveFilterPill label={`Showing ${formatEnum(activeQuickFilter)}`} onClear={onQuickFilterClear} /> : null}

      {disputes.length ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                <th className="px-3 py-3 text-left font-medium">Dispute ID</th>
                <th className="px-3 py-3 text-left font-medium">Customer</th>
                <th className="px-3 py-3 text-left font-medium">Provider</th>
                <th className="px-3 py-3 text-left font-medium">Status</th>
                <th className="px-3 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
          {disputes.map((dispute) => (
            <tr key={dispute.id} className="align-top">
              <td className="px-3 py-3">
                <p className="font-medium">#{dispute.id}</p>
                <p className="text-xs text-muted-foreground">{dispute.jobId ? `Job #${dispute.jobId}` : "No job"}</p>
              </td>
              <td className="px-3 py-3">
                <p className="font-medium">{dispute.clientName}</p>
              </td>
              <td className="px-3 py-3">
                <p className="font-medium">{dispute.professionalName}</p>
              </td>
              <td className="px-3 py-3">
                <div className="flex flex-col items-start gap-1">
                  <Badge variant={getDisputeStatusVariant(dispute.status)}>{formatEnum(dispute.status)}</Badge>
                  <Badge variant={dispute.priority === "HIGH" ? "destructive" : "outline"}>{formatEnum(dispute.priority)}</Badge>
                </div>
              </td>
              <td className="px-3 py-3">
                <div className="ml-auto flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => onOpenDispute(dispute)}>
                    <Eye className="h-3.5 w-3.5" />
                    Open
                  </Button>
                </div>
              </td>
            </tr>
          ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No disputes found" description="Raised disputes will appear here for admin review." />
      )}
    </section>
  );
}

function JobSection({
  jobs,
  query,
  filters,
  statuses,
  activeQuickFilter,
  onQueryChange,
  onFiltersChange,
  onQuickFilterClear,
  onOpenJob,
}: {
  jobs: AdminJobRecord[];
  query: string;
  filters: JobFilters;
  statuses: string[];
  activeQuickFilter: JobQuickFilter | null;
  onQueryChange: (value: string) => void;
  onFiltersChange: (value: JobFilters) => void;
  onQuickFilterClear: () => void;
  onOpenJob: (job: AdminJobRecord) => void;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-soft">
      <SectionHeader
        icon={BriefcaseBusiness}
        title="Posted jobs"
        description="View client jobs, assigned professionals, budgets, deadlines, and work status."
        query={query}
        placeholder="Search jobs..."
        onQueryChange={onQueryChange}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <FilterSelect label="Status" value={filters.status} values={["ALL", ...statuses]} onChange={(value) => onFiltersChange({ ...filters, status: value })} />
        <FilterSelect label="Payment" value={filters.paymentStatus} values={["ALL", "PENDING", "PAID", "REFUND_DUE"]} onChange={(value) => onFiltersChange({ ...filters, paymentStatus: value })} />
      </div>
      {activeQuickFilter ? <ActiveFilterPill label={`Showing ${formatEnum(activeQuickFilter)}`} onClear={onQuickFilterClear} /> : null}

      {jobs.length ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                <th className="px-3 py-3 text-left font-medium">Job ID</th>
                <th className="px-3 py-3 text-left font-medium">Customer</th>
                <th className="px-3 py-3 text-left font-medium">Service Provider</th>
                <th className="px-3 py-3 text-left font-medium">Status</th>
                <th className="px-3 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
          {jobs.map((job) => (
            <tr key={job.id} className="align-top">
              <td className="px-3 py-3">
                <p className="font-medium">#{job.id}</p>
                <p className="max-w-[160px] truncate text-xs text-muted-foreground">{job.title}</p>
              </td>
              <td className="px-3 py-3">
                <p className="font-medium">{job.clientName}</p>
              </td>
              <td className="px-3 py-3">
                <p className="font-medium">{job.professionalName || "Not assigned"}</p>
              </td>
              <td className="px-3 py-3">
                <div className="flex flex-wrap gap-1">
                  {getJobStatusBadges(job).map((badge) => (
                    <Badge key={badge.label} variant={badge.variant}>{badge.label}</Badge>
                  ))}
                </div>
              </td>
              <td className="px-3 py-3">
                <div className="ml-auto flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => onOpenJob(job)}>
                    <Eye className="h-3.5 w-3.5" />
                    Open
                  </Button>
                </div>
              </td>
            </tr>
          ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No jobs found" description="Client job posts will appear here after they are created." />
      )}
    </section>
  );
}

function JobDetailModal({ job, onClose }: { job: AdminJobRecord; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-xl border border-border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-semibold">{job.title}</h2>
              {getJobStatusBadges(job).map((badge) => (
                <Badge key={badge.label} variant={badge.variant}>{badge.label}</Badge>
              ))}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Job #{job.id} / {job.category} / Uploaded by {job.clientName} on {formatDateTime(job.createdAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close job details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-auto p-5">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="space-y-4">
              <InfoPanel title="Job details" icon={BriefcaseBusiness}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoLine icon={UserRound} label="Client" value={`${job.clientName} / ${job.clientEmail}`} />
                  <InfoLine
                    icon={BriefcaseBusiness}
                    label="Assigned professional"
                    value={job.professionalName ? `${job.professionalName} / ${job.professionalEmail}` : "Not assigned"}
                  />
                  <InfoLine icon={CalendarDays} label="Posted" value={formatDateTime(job.createdAt)} />
                  <InfoLine icon={Clock3} label="Updated" value={formatDateTime(job.updatedAt)} />
                  <InfoLine icon={CalendarDays} label="Job date" value={formatDate(job.jobDate)} />
                  <InfoLine icon={CalendarDays} label="Deadline" value={formatDate(job.deadline)} />
                  <InfoLine icon={Clock3} label="Urgency" value={formatEnum(job.urgency)} />
                  <InfoLine icon={Clock3} label="Work mode" value={formatEnum(job.workMode)} />
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Description</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm">{job.description || "No description added."}</p>
                </div>
              </InfoPanel>

              <InfoPanel title="Timeline" icon={Clock3}>
                <div className="grid gap-2">
                  <TimelineRow label="Job uploaded by client" value={formatDateTime(job.createdAt)} />
                  <TimelineRow label="Last updated" value={formatDateTime(job.updatedAt)} />
                  <TimelineRow label="Professional accepted" value={formatDateTime(job.acceptedAt)} />
                  <TimelineRow label="Completion submitted" value={formatDateTime(job.completionSubmittedAt)} />
                  <TimelineRow label="Completed / closed" value={formatDateTime(job.completedAt)} />
                </div>
              </InfoPanel>
            </section>

            <section className="space-y-4">
              <InfoPanel title="Budget & location" icon={MapPin}>
                <div className="grid gap-3">
                  <InfoLine icon={BriefcaseBusiness} label="Budget" value={formatBudget(job.budgetMin, job.budgetMax)} />
                  <InfoLine icon={DollarSign} label="Payment status" value={formatEnum(getPaymentStatus(job))} />
                  <InfoLine icon={DollarSign} label="Transaction ID" value={job.trackingId ? `Tracking #${job.trackingId}` : "Not available"} />
                  <InfoLine icon={RotateCcw} label="Refund status" value={getPaymentStatus(job) === "REFUND_DUE" ? "Review needed" : "No refund pending"} />
                  <InfoLine icon={Clock3} label="Timing type" value={formatEnum(job.timingType)} />
                  <InfoLine icon={MapPin} label="Location label" value={job.locationLabel || "Not set"} />
                  <InfoLine icon={MapPin} label="Address" value={job.locationAddress || "Not set"} />
                  <InfoLine
                    icon={MapPin}
                    label="Coordinates"
                    value={job.locationLat != null && job.locationLng != null ? `${job.locationLat}, ${job.locationLng}` : "Not set"}
                  />
                </div>
              </InfoPanel>

              <InfoPanel title="Client uploaded files" icon={Paperclip}>
                {job.attachments.length ? (
                  <div className="space-y-2">
                    {job.attachments.map((attachment) => (
                      <FileRow
                        key={attachment.id}
                        title={attachment.fileName}
                        subtitle={`Uploaded by ${job.clientName} / ${formatDateTime(attachment.createdAt)} / ${formatFileSize(attachment.fileSize)}`}
                        href={attachment.previewUrl}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No client files uploaded.</p>
                )}
              </InfoPanel>
            </section>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <InfoPanel title="Professional proposals" icon={Mail}>
              {job.requests.length ? (
                <div className="space-y-3">
                  {job.requests.map((request) => (
                    <div key={request.id} className="rounded-lg border border-border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium">{request.professionalName}</p>
                          <p className="text-xs text-muted-foreground">{request.professionalEmail}</p>
                        </div>
                        <Badge variant={request.status === "ACCEPTED" ? "default" : "outline"}>{formatEnum(request.status)}</Badge>
                      </div>
                      <div className="mt-2 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                        <span>Bid: {request.bidAmount ? formatMoney(request.bidAmount) : "Not set"}</span>
                        <span>Duration: {request.duration || "Not set"}</span>
                        <span>Submitted: {formatDateTime(request.createdAt)}</span>
                        <span>Updated: {formatDateTime(request.updatedAt)}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm">{request.coverLetter || "No cover letter."}</p>
                      <AttachmentJsonList value={request.attachmentsJson} uploadedBy={request.professionalName} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No proposals submitted for this job.</p>
              )}
            </InfoPanel>

            <InfoPanel title="Professional work uploads" icon={Upload}>
              {job.workUploads.length ? (
                <div className="space-y-3">
                  {job.workUploads.map((upload) => (
                    <div key={upload.id} className="rounded-lg border border-border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium">
                            Round {upload.roundNumber}: {upload.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Uploaded by {upload.professionalName} / {formatDateTime(upload.createdAt)}
                          </p>
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{upload.note}</p>
                      {upload.fileName ? <FileRow title={upload.fileName} subtitle="Single uploaded work file" href={upload.fileUrl} /> : null}
                      <AttachmentJsonList value={upload.filesJson} uploadedBy={upload.professionalName} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No professional work uploads yet.</p>
              )}
            </InfoPanel>
          </div>

          <div className="mt-4">
            <InfoPanel title="Activity log" icon={ListChecks}>
              <ActivityLogRows
                rows={[
                  { date: job.createdAt, user: job.clientName, role: "Customer", action: "Created job", description: job.title },
                  ...(job.acceptedAt
                    ? [{ date: job.acceptedAt, user: job.professionalName || "Provider", role: "Provider", action: "Accepted job", description: "Provider assigned to job" }]
                    : []),
                  ...(job.completionSubmittedAt
                    ? [{ date: job.completionSubmittedAt, user: job.professionalName || "Provider", role: "Provider", action: "Submitted work", description: "Completion request submitted" }]
                    : []),
                  { date: job.updatedAt, user: "System", role: "System", action: "Updated record", description: `Status: ${formatEnum(job.trackingStatus || job.status)}` },
                ]}
              />
            </InfoPanel>
          </div>
        </div>
      </div>
    </div>
  );
}

function DisputeDetailModal({
  dispute,
  pending,
  onClose,
  onStatusChange,
}: {
  dispute: AdminDisputeRecord;
  pending: boolean;
  onClose: () => void;
  onStatusChange: (dispute: AdminDisputeRecord, status: DisputeStatus) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-xl border border-border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-semibold">Dispute #{dispute.id}</h2>
              <Badge variant={getDisputeStatusVariant(dispute.status)}>{formatEnum(dispute.status)}</Badge>
              <Badge variant={dispute.priority === "HIGH" ? "destructive" : "outline"}>{formatEnum(dispute.priority)}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Job #{dispute.jobId || "unlinked"} / {dispute.jobTitle} / Opened {formatDateTime(dispute.createdAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close dispute details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-auto p-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <InfoPanel title="Dispute information" icon={AlertTriangle}>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoLine icon={FileText} label="Reason" value={formatEnum(dispute.issueType)} />
                <InfoLine icon={BriefcaseBusiness} label="Job ID" value={dispute.jobId ? `#${dispute.jobId}` : "Not linked"} />
                <InfoLine icon={CalendarDays} label="Created" value={formatDateTime(dispute.createdAt)} />
                <InfoLine icon={Clock3} label="Updated" value={formatDateTime(dispute.updatedAt)} />
              </div>
              <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Description</p>
                <p className="mt-2 whitespace-pre-wrap text-sm">{dispute.message}</p>
              </div>
            </InfoPanel>

            <InfoPanel title="People" icon={UserRound}>
              <div className="grid gap-3">
                <InfoLine icon={UserRound} label="Reporter" value={`${dispute.reporterName} / ${formatEnum(dispute.reporterRole)} / ${dispute.reporterEmail}`} />
                <InfoLine icon={UserRound} label="Customer" value={`${dispute.clientName} / ${dispute.clientEmail}`} />
                <InfoLine icon={BriefcaseBusiness} label="Provider" value={`${dispute.professionalName} / ${dispute.professionalEmail}`} />
              </div>
            </InfoPanel>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <InfoPanel title="Evidence & conversation" icon={Paperclip}>
              <EmptyState title="No evidence files attached" description="Images, videos, PDFs, screenshots, and admin notes will appear here when the evidence table is connected." />
              <div className="mt-3 rounded-lg border border-border bg-background p-3 text-sm">
                <p className="font-medium">Conversation timeline</p>
                <p className="mt-1 text-muted-foreground">Customer/provider messages and admin notes are ready to display once message history is exposed to this admin loader.</p>
              </div>
            </InfoPanel>

            <InfoPanel title="Resolution actions" icon={ShieldCheck}>
              <div className="grid gap-2 sm:grid-cols-3">
                <Button type="button" size="sm" variant={dispute.status === "OPEN" ? "default" : "outline"} disabled={pending} onClick={() => onStatusChange(dispute, "OPEN")}>Open</Button>
                <Button type="button" size="sm" variant={dispute.status === "UNDER_REVIEW" ? "default" : "outline"} disabled={pending} onClick={() => onStatusChange(dispute, "UNDER_REVIEW")}>Under review</Button>
                <Button type="button" size="sm" variant={dispute.status === "RESOLVED" ? "default" : "outline"} disabled={pending} onClick={() => onStatusChange(dispute, "RESOLVED")}>Resolved</Button>
              </div>
              <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Status update</p>
                <p className="mt-1 text-sm text-muted-foreground">Use these actions after reviewing the dispute details and party information.</p>
              </div>
            </InfoPanel>
          </div>

          <div className="mt-4">
            <InfoPanel title="Resolution history" icon={ListChecks}>
              <ActivityLogRows
                rows={[
                  { date: dispute.createdAt, user: dispute.reporterName, role: formatEnum(dispute.reporterRole), action: "Opened dispute", description: dispute.message },
                  { date: dispute.updatedAt, user: "Admin/System", role: "Admin", action: "Updated status", description: `Current status: ${formatEnum(dispute.status)}` },
                ]}
              />
            </InfoPanel>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoPanel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof BriefcaseBusiness;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function FilterInput({ value, placeholder, onChange }: { value: string; placeholder: string; onChange: (value: string) => void }) {
  return (
    <div className="relative">
      <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-11 rounded-xl pl-9 shadow-sm" />
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
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="h-11 rounded-xl shadow-sm">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {values.map((option) => (
          <SelectItem key={option} value={option}>
            {option === "ALL" ? `All ${label.toLowerCase()}` : formatEnum(option)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ActiveFilterPill({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
      {label}
      <button type="button" onClick={onClear} className="rounded-full p-0.5 hover:bg-primary/10" aria-label="Clear quick filter">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function AdminActionButton({ label, block, destructive }: { label: string; block?: boolean; destructive?: boolean }) {
  return (
    <Button
      type="button"
      variant={destructive ? "destructive" : "outline"}
      size="sm"
      disabled
      className={block ? "w-full justify-start" : ""}
      title="Server action not connected yet"
    >
      {destructive ? <Trash2 className="mr-1 h-3.5 w-3.5" /> : null}
      {label}
    </Button>
  );
}

function AnalyticsStrip({ jobs, disputes }: { jobs: AdminJobRecord[]; disputes: AdminDisputeRecord[] }) {
  const stats = getPageStats(jobs, disputes);
  const completionRate = stats.totalJobs ? Math.round((stats.completedJobs / stats.totalJobs) * 100) : 0;
  const cancellationRate = stats.totalJobs ? Math.round((stats.cancelledJobs / stats.totalJobs) * 100) : 0;
  const resolutionRate = stats.totalDisputes ? Math.round((stats.resolvedDisputes / stats.totalDisputes) * 100) : 0;
  const revenue = jobs.reduce((total, job) => total + (getPaymentStatus(job) === "PAID" ? job.budgetMax || job.budgetMin || 0 : 0), 0);

  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-4 shadow-soft">
      <div className="mb-3 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        <h2 className="font-semibold">Reports & analytics</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Completion rate" value={`${completionRate}%`} />
        <Metric label="Cancellation rate" value={`${cancellationRate}%`} />
        <Metric label="Avg completion" value={getAverageCompletionTime(jobs)} />
        <Metric label="Revenue generated" value={formatMoney(revenue)} />
        <Metric label="Open disputes" value={stats.openDisputes.toLocaleString()} />
        <Metric label="Resolution rate" value={`${resolutionRate}%`} />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function ActivityLogRows({
  rows,
}: {
  rows: Array<{ date: string | null; user: string; role: string; action: string; description: string }>;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[680px] text-sm">
        <thead className="bg-muted/50 text-xs uppercase tracking-[0.12em] text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Date</th>
            <th className="px-3 py-2 text-left font-medium">User</th>
            <th className="px-3 py-2 text-left font-medium">Role</th>
            <th className="px-3 py-2 text-left font-medium">Action</th>
            <th className="px-3 py-2 text-left font-medium">Description</th>
            <th className="px-3 py-2 text-left font-medium">IP Address</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, index) => (
            <tr key={`${row.action}-${index}`}>
              <td className="px-3 py-2 text-muted-foreground">{formatDateTime(row.date)}</td>
              <td className="px-3 py-2">{row.user}</td>
              <td className="px-3 py-2">{row.role}</td>
              <td className="px-3 py-2 font-medium">{row.action}</td>
              <td className="px-3 py-2 text-muted-foreground">{row.description}</td>
              <td className="px-3 py-2 text-muted-foreground">Not logged</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InfoLine({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-background p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <p className="mt-1 break-words text-sm font-medium">{value}</p>
    </div>
  );
}

function TimelineRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function FileRow({ title, subtitle, href }: { title: string; subtitle: string; href?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="shrink-0 text-sm font-medium text-primary">
          Open
        </a>
      ) : null}
    </div>
  );
}

function AttachmentJsonList({ value, uploadedBy }: { value: string | null; uploadedBy: string }) {
  const files = parseAttachmentJson(value);

  if (!files.length) {
    return null;
  }

  return (
    <div className="mt-3 space-y-2">
      {files.map((file, index) => (
        <FileRow
          key={`${file.fileName}-${index}`}
          title={file.fileName || `Attachment ${index + 1}`}
          subtitle={`Uploaded by ${uploadedBy}${file.fileSize ? ` / ${formatFileSize(file.fileSize)}` : ""}`}
          href={file.fileUrl || file.fileDataUrl || null}
        />
      ))}
    </div>
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
  icon: typeof BriefcaseBusiness;
  title: string;
  description: string;
  query: string;
  placeholder: string;
  onQueryChange: (value: string) => void;
}) {
  return (
    <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div className="flex gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={placeholder}
          className="h-11 rounded-xl pl-9 shadow-sm"
        />
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
  icon: typeof BriefcaseBusiness;
  label: string;
  value: number;
  caption: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border bg-card p-4 text-left shadow-soft transition-colors hover:border-primary/40 hover:bg-muted/30 ${
        active ? "border-primary bg-primary/5" : "border-border"
      }`}
    >
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-3 text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">{caption}</p>
    </button>
  );
}

function Detail({ icon: Icon, label }: { icon: typeof UserRound; label: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1">{description}</p>
    </div>
  );
}

function getPageStats(jobs: AdminJobRecord[], disputes: AdminDisputeRecord[]) {
  const unresolvedDisputes = disputes.filter((dispute) => dispute.status !== "RESOLVED");
  const disputedJobIds = new Set(disputes.map((dispute) => dispute.jobId).filter((id): id is number => id != null));

  return {
    totalJobs: jobs.length,
    pendingJobs: jobs.filter((job) => job.status === "DRAFT" || (!job.trackingId && job.status !== "OPEN")).length,
    openJobs: jobs.filter((job) => job.status === "OPEN").length,
    assignedJobs: jobs.filter((job) => Boolean(job.trackingId)).length,
    inProgressJobs: jobs.filter((job) => job.trackingStatus === "ACTIVE").length,
    completedJobs: jobs.filter((job) => job.status === "CLOSED" || job.trackingStatus === "COMPLETED").length,
    cancelledJobs: jobs.filter((job) => job.status === "CANCELLED" || job.trackingStatus === "CANCELLED").length,
    disputedJobs: jobs.filter((job) => disputedJobIds.has(job.id)).length,
    totalDisputes: disputes.length,
    openDisputes: unresolvedDisputes.length,
    newDisputes: disputes.filter((dispute) => dispute.status === "OPEN").length,
    underReviewDisputes: disputes.filter((dispute) => dispute.status === "UNDER_REVIEW").length,
    resolvedDisputes: disputes.filter((dispute) => dispute.status === "RESOLVED").length,
    highPriorityDisputes: unresolvedDisputes.filter((dispute) => dispute.priority === "HIGH").length,
  };
}

function filterJobs(
  jobs: AdminJobRecord[],
  disputes: AdminDisputeRecord[],
  query: string,
  filters: JobFilters,
  quickFilter: JobQuickFilter | null,
) {
  const term = query.trim().toLowerCase();
  const disputedJobIds = new Set(disputes.map((dispute) => dispute.jobId).filter((id): id is number => id != null));

  return jobs.filter((job) => {
    const searchable = [
      String(job.id),
      job.title,
      job.description,
      job.category,
      job.status,
      job.clientName,
      job.clientEmail,
      job.professionalName,
      job.professionalEmail,
      job.trackingStatus,
      job.locationLabel,
      job.locationAddress,
      job.workMode,
    ]
      .join(" ")
      .toLowerCase();
    const statusValues = [job.status, job.trackingStatus].filter(Boolean).map(String);

    if (term && !searchable.includes(term)) return false;
    if (filters.customer.trim() && !`${job.clientName} ${job.clientEmail}`.toLowerCase().includes(filters.customer.trim().toLowerCase())) return false;
    if (
      filters.provider.trim() &&
      !`${job.professionalName || ""} ${job.professionalEmail || ""}`.toLowerCase().includes(filters.provider.trim().toLowerCase())
    ) return false;
    if (filters.category !== "ALL" && job.category !== filters.category) return false;
    if (filters.status !== "ALL" && !statusValues.includes(filters.status)) return false;
    if (filters.paymentStatus !== "ALL" && getPaymentStatus(job) !== filters.paymentStatus) return false;
    if (!matchesJobQuickFilter(job, quickFilter, disputedJobIds)) return false;

    return true;
  });
}

function filterDisputes(
  disputes: AdminDisputeRecord[],
  query: string,
  filters: DisputeFilters,
  quickFilter: DisputeQuickFilter | null,
) {
  const term = query.trim().toLowerCase();

  return disputes.filter((dispute) => {
    const searchable = [
      String(dispute.id),
      dispute.jobId ? String(dispute.jobId) : "",
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

    if (term && !searchable.includes(term)) return false;
    if (filters.status !== "ALL" && dispute.status !== filters.status) return false;
    if (filters.priority !== "ALL" && dispute.priority !== filters.priority) return false;
    if (filters.customer.trim() && !`${dispute.clientName} ${dispute.clientEmail}`.toLowerCase().includes(filters.customer.trim().toLowerCase())) return false;
    if (
      filters.provider.trim() &&
      !`${dispute.professionalName} ${dispute.professionalEmail}`.toLowerCase().includes(filters.provider.trim().toLowerCase())
    ) return false;
    if (!matchesDisputeQuickFilter(dispute, quickFilter)) return false;

    return true;
  });
}

function matchesJobQuickFilter(job: AdminJobRecord, quickFilter: JobQuickFilter | null, disputedJobIds: Set<number>) {
  if (!quickFilter || quickFilter === "TOTAL") return true;
  if (quickFilter === "PENDING") return job.status === "DRAFT" || (!job.trackingId && job.status !== "OPEN");
  if (quickFilter === "OPEN") return job.status === "OPEN";
  if (quickFilter === "ASSIGNED") return Boolean(job.trackingId);
  if (quickFilter === "IN_PROGRESS") return job.trackingStatus === "ACTIVE";
  if (quickFilter === "COMPLETED") return job.status === "CLOSED" || job.trackingStatus === "COMPLETED";
  if (quickFilter === "CANCELLED") return job.status === "CANCELLED" || job.trackingStatus === "CANCELLED";
  if (quickFilter === "DISPUTED") return disputedJobIds.has(job.id);
  return true;
}

function matchesDisputeQuickFilter(dispute: AdminDisputeRecord, quickFilter: DisputeQuickFilter | null) {
  if (!quickFilter || quickFilter === "TOTAL") return true;
  if (quickFilter === "NEW") return dispute.status === "OPEN";
  if (quickFilter === "UNDER_REVIEW") return dispute.status === "UNDER_REVIEW";
  if (quickFilter === "WAITING_CUSTOMER" || quickFilter === "WAITING_PROVIDER") return false;
  if (quickFilter === "RESOLVED" || quickFilter === "CLOSED") return dispute.status === "RESOLVED";
  return true;
}

function getDisputeStatusVariant(status: string) {
  if (status === "OPEN") {
    return "destructive";
  }

  if (status === "UNDER_REVIEW") {
    return "secondary";
  }

  return "outline";
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

function formatMoney(value: number) {
  return `$${value.toLocaleString()}`;
}

function getPaymentStatus(job: AdminJobRecord) {
  if (job.trackingStatus === "COMPLETED" || job.status === "CLOSED") {
    return "PAID";
  }

  if (job.status === "CANCELLED" || job.trackingStatus === "CANCELLED") {
    return "REFUND_DUE";
  }

  return "PENDING";
}

function getJobStatusBadges(job: AdminJobRecord) {
  if (job.status === "CLOSED" || job.trackingStatus === "COMPLETED") {
    return [{ label: "Closed", variant: "outline" as const }];
  }

  if (job.status === "CANCELLED" || job.trackingStatus === "CANCELLED") {
    return [{ label: "Cancelled", variant: "destructive" as const }];
  }

  if (job.status === "OPEN") {
    return [
      { label: "Open", variant: "default" as const },
      { label: "Active", variant: "secondary" as const },
    ];
  }

  if (job.trackingStatus) {
    return [{ label: formatEnum(job.trackingStatus), variant: "secondary" as const }];
  }

  return [{ label: formatEnum(job.status), variant: "outline" as const }];
}

function uniqueOptions(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function getAverageCompletionTime(jobs: AdminJobRecord[]) {
  const completed = jobs
    .map((job) => {
      if (!job.completedAt) return null;
      const start = new Date(job.createdAt).getTime();
      const end = new Date(job.completedAt).getTime();
      if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
      return end - start;
    })
    .filter((value): value is number => value != null);

  if (!completed.length) {
    return "Not enough data";
  }

  const averageMs = completed.reduce((total, value) => total + value, 0) / completed.length;
  const days = Math.max(1, Math.round(averageMs / (1000 * 60 * 60 * 24)));
  return `${days} day${days === 1 ? "" : "s"}`;
}

function formatFileSize(value: number | null) {
  if (!value) {
    return "Size not saved";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${Math.round((value / (1024 * 1024)) * 10) / 10} MB`;
}

function parseAttachmentJson(value: string | null) {
  if (!value) {
    return [] as Array<{
      fileName?: string;
      fileUrl?: string | null;
      fileDataUrl?: string | null;
      fileSize?: number | null;
    }>;
  }

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((file) => file && typeof file === "object")
      .map((file) => ({
        fileName: typeof file.fileName === "string" ? file.fileName : "Attachment",
        fileUrl: typeof file.fileUrl === "string" ? file.fileUrl : null,
        fileDataUrl: typeof file.fileDataUrl === "string" ? file.fileDataUrl : null,
        fileSize: typeof file.fileSize === "number" ? file.fileSize : null,
      }));
  } catch {
    return [];
  }
}

function formatEnum(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
