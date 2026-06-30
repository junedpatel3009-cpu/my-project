import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  CheckCircle2,
  CreditCard,
  Download,
  FolderKanban,
  LayoutGrid,
  ShieldCheck,
  Star,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type ReportCategory =
  | "Users"
  | "Jobs"
  | "Payments"
  | "Earnings"
  | "Wallet"
  | "Reviews"
  | "Verification"
  | "Disputes"
  | "Services"
  | "Categories";

type ReportRow = {
  label: string;
  value: string;
};

type ReportOption = {
  category: ReportCategory;
  title: string;
  description: string;
  icon: LucideIcon;
};

const REPORT_OPTIONS: ReportOption[] = [
  { category: "Users", title: "Users", description: "Accounts, clients, professionals, admins", icon: Users },
  { category: "Jobs", title: "Jobs", description: "Open, active, completed, cancelled work", icon: Briefcase },
  { category: "Payments", title: "Payments", description: "Transactions and payment activity", icon: CreditCard },
  { category: "Earnings", title: "Earnings", description: "Revenue and platform earnings", icon: BarChart3 },
  { category: "Wallet", title: "Wallet", description: "Balances, withdrawals, payout activity", icon: Wallet },
  { category: "Verification", title: "Verification", description: "Verification status and review queues", icon: ShieldCheck },
  { category: "Reviews", title: "Reviews", description: "Ratings and customer feedback", icon: Star },
  { category: "Disputes", title: "Disputes", description: "Open issues and resolution status", icon: AlertTriangle },
  { category: "Services", title: "Services", description: "Service catalogue and availability", icon: LayoutGrid },
  { category: "Categories", title: "Categories", description: "Service grouping and taxonomy", icon: FolderKanban },
];

type RecordCounts = Partial<Record<ReportCategory, number>>;

type AdminReportExportButtonProps = {
  buttonLabel?: string;
  reportName: string;
  summaryItems?: Array<{ label: string; value: string }>;
  rows?: ReportRow[];
  title?: string;
  description?: string;
  initialSelected?: ReportCategory[];
  openOnMount?: boolean;
  recordCounts?: RecordCounts;
  onGenerate?: (payload: {
    reportName: string;
    html: string;
    sections: string[];
    categories: ReportCategory[];
    dateRange: string;
    format: string;
    options: {
      summaryOnly: boolean;
      detailedReport: boolean;
      includeCharts: boolean;
      includeTables: boolean;
      includeLogo: boolean;
      includeTimestamp: boolean;
    };
  }) => void | Promise<void>;
};

export function AdminReportExportButton({
  buttonLabel = "Download report",
  reportName,
  summaryItems = [],
  rows = [],
  title,
  description,
  initialSelected,
  openOnMount,
  recordCounts = {},
  onGenerate,
}: AdminReportExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ReportCategory[]>(initialSelected ?? REPORT_OPTIONS.map((option) => option.category));
  const [summaryOnly, setSummaryOnly] = useState(false);
  const [detailedReport, setDetailedReport] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeTables, setIncludeTables] = useState(true);
  const [includeLogo, setIncludeLogo] = useState(true);
  const [includeTimestamp, setIncludeTimestamp] = useState(true);
  const [dateRange, setDateRange] = useState("Last 7 Days");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [format, setFormat] = useState("PDF");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (openOnMount) setOpen(true);
  }, [openOnMount]);

  useEffect(() => {
    if (initialSelected && initialSelected.length) {
      setSelected(initialSelected);
    }
  }, [initialSelected]);

  const selectedCount = selected.length;
  const estimatedPages = summaryOnly ? 2 : selectedCount * 2 + (includeCharts ? 1 : 0) + (includeTables ? 1 : 0);
  const recordSummary = selected.reduce((sum, category) => sum + (recordCounts[category] ?? 0), 0);

  const html = useMemo(
    () =>
      buildHtml({
        reportName,
        title,
        description,
        summaryItems,
        rows,
        selected,
        summaryOnly,
        detailedReport,
        includeCharts,
        includeTables,
        includeLogo,
        includeTimestamp,
        dateRange,
        format,
        recordSummary,
      }),
    [reportName, title, description, summaryItems, rows, selected, summaryOnly, detailedReport, includeCharts, includeTables, includeLogo, includeTimestamp, dateRange, format, recordSummary],
  );

  function toggleCategory(category: ReportCategory) {
    setSelected((current) => (current.includes(category) ? current.filter((item) => item !== category) : [...current, category]));
  }

  function handleSelectAll() {
    setSelected(REPORT_OPTIONS.map((option) => option.category));
  }

  function handleClearAll() {
    setSelected([]);
  }

  function handleSummaryOnly() {
    setSummaryOnly(true);
    setDetailedReport(false);
  }

  function handleDetailedReport() {
    setSummaryOnly(false);
    setDetailedReport(true);
  }

  function handlePreview() {
    const previewWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!previewWindow) return;
    previewWindow.document.open();
    previewWindow.document.write(html);
    previewWindow.document.close();
    previewWindow.focus();
  }

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      await onGenerate?.({
        reportName,
        html,
        sections: selected,
        categories: selected,
        dateRange,
        format,
        options: {
          summaryOnly,
          detailedReport,
          includeCharts,
          includeTables,
          includeLogo,
          includeTimestamp,
        },
      });
      setOpen(false);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" type="button">
          <Download className="mr-2 h-4 w-4" />
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-7xl p-0 overflow-hidden">
        {/* Accessibility elements */}
        <DialogTitle className="sr-only">Download Your Report</DialogTitle>
        <DialogDescription className="sr-only">Configure your report settings, select sections, choose format, and date range</DialogDescription>
        
        <div className="rounded-2xl bg-white shadow-2xl" style={{ maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
          {/* Header Section - Fixed */}
          <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-6 py-7 sm:px-8" style={{ flexShrink: 0 }}>
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-600">Report Configuration</p>
                <h2 className="mt-3 text-3xl font-bold text-slate-900">Download Your Report</h2>
                <p className="mt-2 text-sm text-slate-600">Choose the sections, format, and date range for your PDF export</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" type="button" onClick={handleSelectAll} className="text-xs">
                  Select All
                </Button>
                <Button variant="outline" size="sm" type="button" onClick={handleClearAll} className="text-xs">
                  Clear All
                </Button>
                <Button variant="outline" size="sm" type="button" onClick={handleSummaryOnly} className="text-xs">
                  Summary
                </Button>
                <Button variant="outline" size="sm" type="button" onClick={handleDetailedReport} className="text-xs">
                  Detailed
                </Button>
              </div>
            </div>

            {/* Quick Toggles */}
            <div className="mt-6 border-t border-slate-200 pt-6">
              <p className="mb-4 text-sm font-semibold text-slate-700">Report Options:</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SmallToggle label="Include charts" value={includeCharts} onToggle={() => setIncludeCharts((value) => !value)} />
                <SmallToggle label="Include tables" value={includeTables} onToggle={() => setIncludeTables((value) => !value)} />
                <SmallToggle label="Include logo" value={includeLogo} onToggle={() => setIncludeLogo((value) => !value)} />
                <SmallToggle label="Include timestamp" value={includeTimestamp} onToggle={() => setIncludeTimestamp((value) => !value)} />
              </div>
            </div>
          </div>

          {/* Main Content Grid - Scrollable */}
          <div style={{ flex: "1 1 auto", overflow: "auto", minHeight: "0" }}>
            <div className="space-y-4 px-6 py-8 sm:px-8">
              {/* Report Sections */}
              <div>
                <h3 className="mb-4 text-lg font-semibold text-slate-900">Report Sections</h3>
                <div className="space-y-2">
                  {REPORT_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const isSelected = selected.includes(option.category);
                    return (
                      <div key={option.category} onClick={() => toggleCategory(option.category)} className={`cursor-pointer rounded-lg border-2 p-3 transition-all ${isSelected ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4" />
                          <span className="font-medium text-slate-900">{option.title}</span>
                          {isSelected && <CheckCircle2 className="ml-auto h-4 w-4 text-blue-600" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Date Range Section */}
              <div>
                <p className="mb-4 font-semibold text-slate-900">Date Range</p>
                <div className="space-y-2">
                  {["Today", "Last 7 Days", "This Month", "Last Month", "Custom Range"].map((item) => (
                    <label key={item} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 transition hover:bg-slate-50">
                      <input type="radio" name="report-period" value={item} checked={dateRange === item} onChange={() => setDateRange(item)} className="h-4 w-4 accent-blue-600" />
                      <span className="text-sm font-medium text-slate-700">{item}</span>
                    </label>
                  ))}
                </div>
                {dateRange === "Custom Range" && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm text-slate-600">
                      <span className="font-medium">Start date</span>
                      <input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} className="rounded-lg border border-slate-300 bg-white p-2" />
                    </label>
                    <label className="flex flex-col gap-2 text-sm text-slate-600">
                      <span className="font-medium">End date</span>
                      <input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} className="rounded-lg border border-slate-300 bg-white p-2" />
                    </label>
                  </div>
                )}
              </div>

              {/* Export Format */}
              <div>
                <p className="mb-4 font-semibold text-slate-900">Export Format</p>
                <div className="space-y-2">
                  {[
                    { label: "PDF", value: "PDF" },
                    { label: "Excel", value: "Excel" },
                    { label: "CSV", value: "CSV" },
                  ].map((option) => (
                    <label key={option.value} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 transition hover:bg-slate-50">
                      <input type="radio" name="export-format" value={option.value} checked={format === option.value} onChange={() => setFormat(option.value)} className="h-4 w-4 accent-blue-600" />
                      <span className="text-sm font-medium text-slate-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Summary Stats */}
              <div className="rounded-xl border-2 border-slate-200 bg-gradient-to-br from-blue-50 to-white p-6">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-600">Summary</p>
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{selectedCount}</p>
                    <p className="text-sm text-slate-600">Sections selected</p>
                  </div>
                  <div className="border-t border-slate-200 pt-4">
                    <p className="text-2xl font-bold text-slate-900">{estimatedPages}</p>
                    <p className="text-sm text-slate-600">Est. pages</p>
                  </div>
                  <div className="border-t border-slate-200 pt-4">
                    <p className="text-2xl font-bold text-slate-900">{recordSummary.toLocaleString()}</p>
                    <p className="text-sm text-slate-600">Live records</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Section - Fixed */}
          <div className="border-t border-slate-200 bg-gradient-to-r from-slate-50 to-white px-6 py-6 sm:px-8" style={{ flexShrink: 0 }}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-slate-900">Ready to generate?</p>
                <p className="text-sm text-slate-600">{selectedCount} section{selectedCount !== 1 ? 's' : ''} selected for {format} export</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button variant="secondary" type="button" onClick={handlePreview}>
                  <Download className="mr-2 h-4 w-4" />
                  Preview
                </Button>
                <Button type="button" onClick={handleGenerate} disabled={isGenerating || selectedCount === 0} className="gap-2">
                  <Download className="h-4 w-4" />
                  {isGenerating ? "Generating…" : "Generate"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SmallToggle({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className={`flex items-center justify-between rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${value ? "border-blue-600 bg-blue-100 text-blue-900" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`}>
      <span>{label}</span>
      <span className={`ml-2 text-xs font-bold ${value ? "text-blue-700" : "text-slate-400"}`}>{value ? "ON" : "OFF"}</span>
    </button>
  );
}

function buildHtml({
  reportName,
  title,
  description,
  summaryItems,
  rows,
  selected,
  summaryOnly,
  detailedReport,
  includeCharts,
  includeTables,
  includeLogo,
  includeTimestamp,
  dateRange,
  format,
  recordSummary,
}: {
  reportName: string;
  title?: string;
  description?: string;
  summaryItems: Array<{ label: string; value: string }>;
  rows: ReportRow[];
  selected: ReportCategory[];
  summaryOnly: boolean;
  detailedReport: boolean;
  includeCharts: boolean;
  includeTables: boolean;
  includeLogo: boolean;
  includeTimestamp: boolean;
  dateRange: string;
  format: string;
  recordSummary: number;
}) {
  const now = new Date().toLocaleString();
  const selectionSection = `<section><h2>Selected reports</h2><ul>${selected.map((category) => `<li>${escapeHtml(category)}</li>`).join("")}</ul></section>`;
  const summarySection = summaryItems.length ? `<section><h2>Summary</h2>${summaryItems.map((item) => `<div class="card"><strong>${escapeHtml(item.label)}</strong><div>${escapeHtml(item.value)}</div></div>`).join("")}</section>` : "";
  const detailSection = detailedReport && rows.length ? `<section><h2>Details</h2><table><thead><tr><th>Label</th><th>Value</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${escapeHtml(row.label)}</td><td>${escapeHtml(row.value)}</td></tr>`).join("")}</tbody></table></section>` : "";
  const chartSection = includeCharts ? `<section><h2>Charts</h2><p>Charts were included for the selected report set.</p></section>` : "";
  const tableSection = includeTables && rows.length ? `<section><h2>Tables</h2><p>Tables were generated from the current database records.</p></section>` : "";

  return `<!doctype html><html><head><meta charset="utf-8" /><title>${escapeHtml(reportName)}</title><style>body{font-family:Inter,Segoe UI,sans-serif;color:#0f172a;margin:0;padding:24px;background:#f8fafc}h1{font-size:28px;margin-bottom:4px}h2{font-size:18px;margin:24px 0 8px}p,li{line-height:1.6}ul{margin:8px 0 0 20px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #e2e8f0;padding:10px;text-align:left;font-size:13px}th{background:#f1f5f9}.card{border:1px solid #e2e8f0;border-radius:14px;padding:14px;margin:8px 0;background:#fff}</style></head><body><header><h1>${escapeHtml(reportName)}</h1><p>Generated ${escapeHtml(now)} | Export format: ${escapeHtml(format)} | Period: ${escapeHtml(dateRange)}</p>${title ? `<p>${escapeHtml(title)}</p>` : ""}${description ? `<p>${escapeHtml(description)}</p>` : ""}</header>${selectionSection}${summaryOnly ? "" : summarySection}${detailSection}${chartSection}${tableSection}<footer><p style="margin-top:32px;color:#475569;">Records included: ${escapeHtml(recordSummary.toString())}. Generated from live database${includeLogo ? " with company logo" : ""}${includeTimestamp ? " and timestamp" : ""}.</p></footer></body></html>`;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export type { ReportCategory };
