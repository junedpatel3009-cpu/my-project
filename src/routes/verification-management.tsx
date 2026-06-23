import { createServerFn } from "@tanstack/react-start";
import { createFileRoute, Link, useLoaderData, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileBadge,
  FileCheck2,
  FileText,
  IdCard,
  ImageIcon,
  MapPin,
  Search,
  ShieldCheck,
  UserRound,
  X,
  XCircle,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentUser } from "@/lib/current-user.server";
import {
  getAdminVerificationRecords,
  updateProfessionalVerificationStatusByAdmin,
  type AdminVerificationRecord,
  type ProfessionalVerificationInfo,
} from "@/lib/pro-verification-db.server";

type VerificationStatus = ProfessionalVerificationInfo["status"];
type StatusFilter = "all" | VerificationStatus;

const getVerificationManagementData = createServerFn({ method: "GET" }).handler(async () => {
  const viewer = getCurrentUser();

  if (!viewer || viewer.role !== "ADMIN") {
    return {
      viewer,
      records: [],
    };
  }

  return {
    viewer,
    records: getAdminVerificationRecords(),
  };
});

const updateVerificationReviewStatus = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: number; status: VerificationStatus }) => input)
  .handler(async ({ data }) => {
    const viewer = getCurrentUser();

    if (!viewer || viewer.role !== "ADMIN") {
      throw new Error("Only admins can review professional verification.");
    }

    return updateProfessionalVerificationStatusByAdmin(data.userId, data.status);
  });

export const Route = createFileRoute("/verification-management")({
  loader: () => getVerificationManagementData(),
  head: () => ({ meta: [{ title: "Verification Management - Servio" }] }),
  component: VerificationManagement,
});

function VerificationManagement() {
  const data = useLoaderData({ from: "/verification-management" });
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<{ url: string; label: string } | null>(null);

  const records = data.records as AdminVerificationRecord[];
  const visibleRecords = useMemo(
    () => filterRecords(records, query, statusFilter),
    [records, query, statusFilter],
  );

  const handleClosePreview = useCallback(() => {
    setPreviewFile(null);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClosePreview();
      }
    };

    if (previewFile) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [previewFile, handleClosePreview]);

  if (!data.viewer || data.viewer.role !== "ADMIN") {
    return (
      <div className="grid min-h-screen place-items-center bg-muted/30 px-4">
        <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 text-center shadow-soft">
          <ShieldCheck className="mx-auto h-8 w-8 text-primary" />
          <h1 className="mt-4 text-xl font-semibold">Admin access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in from the admin panel to review professional verification.
          </p>
          <Button asChild className="mt-5 w-full">
            <Link to="/admin">Open admin panel</Link>
          </Button>
        </div>
      </div>
    );
  }

  const displayName = `${data.viewer.firstName} ${data.viewer.lastName}`.trim() || data.viewer.email;
  const counts = getStatusCounts(records);

  async function handleReview(record: AdminVerificationRecord, status: VerificationStatus) {
    const actionKey = `${status}-${record.userId}`;
    setPendingAction(actionKey);

    try {
      await updateVerificationReviewStatus({ data: { userId: record.userId, status } });
      await router.invalidate();
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <AppShell userName={displayName} userRole="Admin" userAvatarUrl={data.viewer.avatarUrl}>
      <div className="mb-6 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-primary">Verification management</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Verification Management Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review professional identity documents and approve verified providers.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/user-management">User Management</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin">Back to admin</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard icon={UserRound} label="Professionals" value={records.length} caption="Total accounts" active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
        <SummaryCard icon={Clock3} label="Pending" value={counts.pending} caption="Need admin review" active={statusFilter === "pending"} onClick={() => setStatusFilter("pending")} />
        <SummaryCard icon={CheckCircle2} label="Approved" value={counts.approved} caption="Verified providers" active={statusFilter === "approved"} onClick={() => setStatusFilter("approved")} />
        <SummaryCard icon={XCircle} label="Rejected" value={counts.rejected} caption="Needs correction" active={statusFilter === "rejected"} onClick={() => setStatusFilter("rejected")} />
        <SummaryCard icon={FileText} label="Not started" value={counts.not_started} caption="No review yet" active={statusFilter === "not_started"} onClick={() => setStatusFilter("not_started")} />
      </div>

      <section className="mt-6 rounded-xl border border-border bg-card p-4 shadow-soft">
        <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
          <div>
            <h2 className="text-lg font-semibold">Professional verification requests</h2>
            <p className="text-sm text-muted-foreground">
              Search by professional, email, category, city, document, or status.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 lg:max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search verification..."
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(["all", "pending", "approved", "rejected", "not_started"] as StatusFilter[]).map((status) => (
                <Button
                  key={status}
                  type="button"
                  size="sm"
                  variant={statusFilter === status ? "default" : "outline"}
                  onClick={() => setStatusFilter(status)}
                >
                  {status === "all" ? "All" : formatEnum(status)}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {visibleRecords.length ? (
          <div className="divide-y divide-border rounded-lg border border-border">
            {visibleRecords.map((record) => {
              const statusMeta = getStatusMeta(record.status);
              const documents = getDocumentItems(record);

              return (
                <article key={record.userId} className="p-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                        <img
                          src={record.avatarUrl || `https://i.pravatar.cc/100?u=verification-${record.userId}`}
                          className="h-12 w-12 rounded-full object-cover"
                          alt=""
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate font-semibold">{record.professionalName}</h3>
                            <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                            <Badge variant={record.isActive ? "default" : "outline"}>
                              {record.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <Badge variant={record.isVerified ? "default" : "secondary"}>
                              {record.isVerified ? "Verified" : "Not verified"}
                            </Badge>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span>{record.professionalEmail}</span>
                            <span className="inline-flex items-center gap-1">
                              <FileBadge className="h-3.5 w-3.5" />
                              {record.professionalCategory || "Category not set"}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {record.professionalCity || "City not set"}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock3 className="h-3.5 w-3.5" />
                              Updated {formatDateTime(record.updatedAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                        {documents.map((document) => (
                          <div key={document.label} className="rounded-lg border border-border bg-background p-3">
                            <div className="flex items-center gap-2">
                              <document.icon className="h-4 w-4 text-primary" />
                              <p className="min-w-0 truncate text-sm font-medium">{document.label}</p>
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <Badge variant={document.hasValue ? "default" : "outline"}>
                                {document.hasValue ? "Uploaded" : "Missing"}
                              </Badge>
                              {document.href ? (
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    type="button"
                                    onClick={() => setPreviewFile({ url: document.href, label: document.label })}
                                  >
                                    Open
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2 xl:w-60 xl:flex-col">
                      <Button
                        type="button"
                        className="gap-2"
                        disabled={pendingAction !== null || record.status === "approved"}
                        onClick={() => handleReview(record, "approved")}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        className="gap-2"
                        disabled={pendingAction !== null || record.status === "rejected"}
                        onClick={() => handleReview(record, "rejected")}
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-2"
                        disabled={pendingAction !== null || record.status === "pending"}
                        onClick={() => handleReview(record, "pending")}
                      >
                        <Clock3 className="h-4 w-4" />
                        Mark pending
                      </Button>
                      {pendingAction?.endsWith(`-${record.userId}`) ? (
                        <p className="text-xs text-muted-foreground">Saving review...</p>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No verification records found.
          </div>
        )}
      </section>

      {previewFile ? (
        <FilePreviewModal url={previewFile.url} label={previewFile.label} onClose={handleClosePreview} />
      ) : null}
    </AppShell>
  );
}

function FilePreviewModal({ url, label, onClose }: { url: string; label: string; onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const previewType = getPreviewType(url);

  const handleOverlayClick = useCallback(
    (event: React.MouseEvent) => {
      if (event.target === overlayRef.current) {
        onClose();
      }
    },
    [onClose],
  );

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">{label}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" type="button" onClick={() => openDocumentInNewTab(url)}>
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Open in new tab
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-5">
          {previewType === "image" ? (
            <div className="flex h-full items-center justify-center">
              <img
                src={url}
                alt={label}
                className="max-h-[70vh] max-w-full rounded-lg object-contain"
              />
            </div>
          ) : previewType === "pdf" ? (
            <iframe
              src={`${url}#toolbar=1`}
              title={label}
              className="h-[70vh] w-full rounded-lg"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <FileText className="h-16 w-16 text-muted-foreground" />
              <div>
                <p className="font-medium">Preview not available</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Open this file in a new tab to view it.
                </p>
              </div>
              <Button type="button" onClick={() => openDocumentInNewTab(url)}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in new tab
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getPreviewType(url: string) {
  const normalized = url.trim().toLowerCase();

  if (normalized.startsWith("data:image/") || /\.(jpe?g|png|gif|bmp|webp|svg)(\?|#|$)/i.test(normalized)) {
    return "image";
  }

  if (normalized.startsWith("data:application/pdf") || /\.pdf(\?|#|$)/i.test(normalized)) {
    return "pdf";
  }

  return "other";
}

function openDocumentInNewTab(url: string) {
  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    return;
  }

  if (!trimmedUrl.startsWith("data:")) {
    window.open(trimmedUrl, "_blank", "noopener,noreferrer");
    return;
  }

  try {
    const blob = dataUrlToBlob(trimmedUrl);
    const objectUrl = URL.createObjectURL(blob);
    window.open(objectUrl, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  } catch {
    window.open(trimmedUrl, "_blank", "noopener,noreferrer");
  }
}

function dataUrlToBlob(dataUrl: string) {
  const [header, payload] = dataUrl.split(",", 2);
  const mimeType = header.match(/^data:([^;]+)/)?.[1] || "application/octet-stream";
  const isBase64 = /;base64$/i.test(header) || /;base64;/i.test(header);
  const binary = isBase64 ? atob(payload || "") : decodeURIComponent(payload || "");
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  caption,
  active,
  onClick,
}: {
  icon: typeof UserRound;
  label: string;
  value: number;
  caption: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={`rounded-lg border bg-card p-4 text-left shadow-soft transition-colors hover:border-primary/40 hover:bg-muted/30 ${active ? "border-primary bg-primary/5" : "border-border"}`}>
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-3 text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">{caption}</p>
    </button>
  );
}

function getDocumentItems(record: AdminVerificationRecord) {
  return [
    {
      label: "Government ID",
      icon: IdCard,
      href: record.governmentIdUrl,
      hasValue: Boolean(record.governmentIdUrl),
    },
    {
      label: "License",
      icon: FileBadge,
      href: record.licenseUrl,
      hasValue: Boolean(record.licenseUrl),
    },
    {
      label: "Certifications",
      icon: FileCheck2,
      href: record.certifications[0] || "",
      hasValue: record.certifications.length > 0,
    },
    {
      label: "Insurance",
      icon: FileText,
      href: record.insuranceUrl,
      hasValue: Boolean(record.insuranceUrl),
    },
    {
      label: "Selfie",
      icon: ImageIcon,
      href: record.selfieUrl,
      hasValue: Boolean(record.selfieUrl),
    },
  ];
}

function getStatusCounts(records: AdminVerificationRecord[]) {
  return records.reduce(
    (counts, record) => ({
      ...counts,
      [record.status]: counts[record.status] + 1,
    }),
    {
      not_started: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
    } satisfies Record<VerificationStatus, number>,
  );
}

function filterRecords(records: AdminVerificationRecord[], query: string, statusFilter: StatusFilter) {
  const term = query.trim().toLowerCase();

  return records.filter((record) => {
    const matchesStatus = statusFilter === "all" || record.status === statusFilter;

    if (!matchesStatus) {
      return false;
    }

    if (!term) {
      return true;
    }

    return [
      record.professionalName,
      record.professionalEmail,
      record.professionalCategory,
      record.professionalCity,
      record.status,
      record.isActive ? "active" : "inactive",
      record.isVerified ? "verified" : "not verified",
      ...record.certifications,
      record.governmentIdUrl,
      record.licenseUrl,
      record.insuranceUrl,
      record.selfieUrl,
    ]
      .join(" ")
      .toLowerCase()
      .includes(term);
  });
}

function getStatusMeta(status: VerificationStatus) {
  const labels = {
    not_started: "Not started",
    pending: "Pending review",
    approved: "Approved",
    rejected: "Rejected",
  };

  return {
    label: labels[status],
    variant: status === "approved" ? "default" : status === "pending" ? "secondary" : "outline",
  } as const;
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

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
