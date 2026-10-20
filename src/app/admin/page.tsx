"use client";
//I added this
function WordIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="2" width="18" height="20" rx="2" fill="#2B579A" />
      <path
        d="M7.2 17L9.1 7h2.1l1.35 6.3L14 7h2.1L18 17h-1.9l-.85-5.4L13.8 17h-1.7l-1.4-5.4L10 17H7.2z"
        fill="white"
      />
    </svg>
  );
}

function PdfIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
        fill="#E4252A"
      />
      <path d="M14 2v6h6" fill="#B71C1C" />
      <path
        d="M8.5 17v-6H10c.9 0 1.5.5 1.5 1.3 0 .7-.5 1.2-1.2 1.2H9.2V17H8.5zm.7-2.3h.5c.4 0 .7-.2.7-.6s-.3-.6-.7-.6h-.5v1.2zM13 17v-6h1.4c1.3 0 2.1.8 2.1 2v2c0 1.2-.8 2-2.1 2H13zm1.2-1.1h.3c.5 0 .9-.3.9-.9v-2c0-.5-.4-.9-.9-.9h-.3v3.8zM18 12.2h-1.1V11H19v1.1h-1.1V17H17v-4.8z"
        fill="white"
      />
    </svg>
  );
}

function ExcelIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="2" width="18" height="20" rx="2" fill="#107C41" />
      <path
        d="M8.2 7h2.4l1.4 3.1L13.4 7h2.4l-2.5 4.9L16 17h-2.4l-1.6-3.4L10.4 17H8l2.7-5.1L8.2 7z"
        fill="white"
      />
    </svg>
  );
}

  function TrashIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

//until here

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ASSETS } from "@/config/assets";
import PlaceholderImage from "@/components/PlaceholderImage";
import StarRating from "@/components/StarRating";

interface FeedbackRecord {
  id: string;
  sessionId: string;
  respondentName: string | null;
  profession: string | null;
  computerId: string | null;
  overallExperience: number | null;
  cleanlinessSatisfaction: number | null;
  recommendationLikelihood: number | null;
  computerPerformance: number | null;
  monitorQuality: number | null;
  equipmentEaseOfUse: number | null;
  equipmentAvailability: number | null;
  chairComfort: number | null;
  roomTemperature: number | null;
  airConditioning: number | null;
  lighting: number | null;
  workspaceSpace: number | null;
  noiseLevel: number | null;
  equipmentCleanliness: number | null;
  arrangementSuitability: number | null;
  concentrationComfort: number | null;
  hasTechnicalIssues: boolean | null;
  technicalIssueDescription: string | null;
  likedMost: string | null;
  featuresWanted: string | null;
  changeImprovement: string | null;
  mostImportantImprovement: string | null;
  submittedAt: string;
  createdAt: string;
}

type ExcelExportMode = "selected" | "filtered" | "all";

export default function AdminDashboard() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [records, setRecords] = useState<FeedbackRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("submittedAt");
  const [sortDir, setSortDir] = useState("desc");
  const [filterField, setFilterField] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<FeedbackRecord | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exportingMode, setExportingMode] = useState<ExcelExportMode | null>(null);
  const [exportError, setExportError] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showFullDetails, setShowFullDetails] = useState(false);
  const [detailPage, setDetailPage] = useState(0);

  const selectAllRef = useRef<HTMLInputElement | null>(null);

  // Check auth
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated) {
          setAuthenticated(true);
          setAdminName(d.username);
        } else {
          router.push("/");
        }
      })
      .catch(() => router.push("/"));
  }, [router]);

  const loadRecords = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        search,
        sortField,
        sortDir,
        filterField,
        filterValue,
        dateFrom,
        dateTo,
      });
      const res = await fetch(`/api/feedback?${params}`);
      const data = await res.json();
      if (res.ok) {
        setRecords(data.records);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [page, search, sortField, sortDir, filterField, filterValue, dateFrom, dateTo]);

  useEffect(() => {
    if (!authenticated) return;
    let active = true;
    const params = new URLSearchParams({
      page: String(page),
      limit: "10",
      search,
      sortField,
      sortDir,
      filterField,
      filterValue,
      dateFrom,
      dateTo,
    });
    fetch(`/api/feedback?${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active) return;
        if (data) {
          setRecords(data.records);
          setTotal(data.total);
          setTotalPages(data.totalPages);
        }
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authenticated, page, search, sortField, sortDir, filterField, filterValue, dateFrom, dateTo]);

  const visibleIds = records.map((r) => r.id);
  const visibleSelectedCount = visibleIds.filter((id) => selectedIds.includes(id)).length;
  const allVisibleSelected = visibleIds.length > 0 && visibleSelectedCount === visibleIds.length;
  const someVisibleSelected = visibleSelectedCount > 0 && visibleSelectedCount < visibleIds.length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleSelected;
    }
  }, [someVisibleSelected]);

  const toggleSelectRecord = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const resetPaginationAndSelection = () => {
    setSelectedIds([]);
    setPage(1);
  };

  const handleDelete = async () => {
    if (!selectedRecord) return;
    const deletedId = selectedRecord.id;
    try {
      const res = await fetch(`/api/feedback/${deletedId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setShowDeleteDialog(false);
        setShowFullDetails(false);
        setDeleteSuccess(true);
        setSelectedRecord(null);
        setSelectedIds((prev) => prev.filter((id) => id !== deletedId));
        setLoading(true);
        void loadRecords();
      }
    } catch {
      // ignore
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  const handleExportWord = (id: string) => {
    window.open(`/api/export/word/${id}`, "_blank");
  };

  const handleExportPdf = (id: string) => {
    window.open(`/api/export/pdf/${id}`, "_blank");
  };

  const handleExportCsv = async () => {
    const ids = records.map((r) => r.id);
    const res = await fetch("/api/export/csv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `COGNITA-Export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleExportExcel = async (mode: ExcelExportMode) => {
    setExportError("");
    if (mode === "selected" && selectedIds.length === 0) {
      setExportError("Please select at least one record checkbox before exporting selected entries.");
      return;
    }

    setExportingMode(mode);
    try {
      const payload =
        mode === "selected"
          ? { mode: "selected" as const, ids: selectedIds, sortField, sortDir }
          : mode === "filtered"
          ? { mode: "filtered" as const, search, filterField, filterValue, dateFrom, dateTo, sortField, sortDir }
          : { mode: "all" as const, sortField, sortDir };

      const res = await fetch("/api/export/excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.error || "Failed to generate Excel export.");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const modeSlug = mode === "selected" ? "Selected" : mode === "filtered" ? "Filtered" : "All";
      const manilaDate = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
      a.href = url;
      a.download = `COGNITA-Feedback-${modeSlug}-${manilaDate}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setExportError(err instanceof Error ? err.message : "Failed to export Excel workbook.");
    } finally {
      setExportingMode(null);
    }
  };

  const hasActiveFilters = Boolean(search.trim() || (filterField && filterValue) || dateFrom || dateTo);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-PH", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-admin-bg flex items-center justify-center">
        <div className="text-admin-gold text-lg">Loading...</div>
      </div>
    );
  }

  if (showFullDetails && selectedRecord) {
    return (
      <FullRecordView
        record={selectedRecord}
        detailPage={detailPage}
        setDetailPage={setDetailPage}
        onClose={() => {
          setShowFullDetails(false);
          setDetailPage(0);
        }}
        onExportWord={() => handleExportWord(selectedRecord.id)}
        onExportPdf={() => handleExportPdf(selectedRecord.id)}
        onDelete={() => setShowDeleteDialog(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-admin-bg relative">
      {/* Background image */}
      <div className="absolute inset-0 opacity-50">
        <PlaceholderImage
          src={ASSETS.adminBackground}
          alt=""
          className="w-full h-full object-cover"
          fallbackText=""
          fallbackClassName="bg-admin-dark"
        />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="bg-admin-dark border-b border-admin-border px-6 py-3 flex items-center justify-between backdrop-blur-sm">
          <h1 className="text-2xl font-serif font-bold text-admin-gold tracking-wider">
            COGNĪTA
          </h1>
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPaginationAndSelection();
              }}
              placeholder="Search records..."
              className="bg-admin-input border border-admin-border rounded-lg px-4 py-2 text-sm text-admin-text placeholder:text-admin-muted/50 focus:border-admin-gold outline-none w-64"
            />
            <button
              onClick={handleExportCsv}
              className="text-xs text-admin-gold border border-admin-border rounded px-3 py-1.5 hover:bg-admin-hover transition-colors"
              title="Export visible records to CSV"
            >
              📊 CSV
            </button>
          </div>
        </div>

        <div className="flex flex-1">
         {/* Sidebar */}
<div className="w-64 border-r border-admin-border p-4 flex flex-col gap-4 backdrop-blur-sm shrink-0 relative overflow-hidden">
  {/* Sidebar background image — behind everything */}
  <div
    className="absolute inset-0 z-0 pointer-events-none"
    aria-hidden="true"
  >
    <PlaceholderImage
      src={ASSETS.adminBackgroundside}
      alt=""
      className="w-full h-full object-cover pointer-events-none"
      fallbackText=""
      fallbackClassName="bg-admin-dark"
    />
    {/* Optional dim overlay so text stays readable without lowering image opacity too much */}
    <div className="absolute inset-0 bg-admin-panel/70" />
  </div>

  {/* All sidebar content sits above the background */}
  <div className="relative z-10 flex flex-col gap-4 h-full">
    {/* Sort */}
    <div>
      <h3 className="text-xs font-bold text-admin-gold mb-2 uppercase tracking-wider">Sort By</h3>
      <select
        value={sortField}
        onChange={(e) => setSortField(e.target.value)}
        className="w-full bg-admin-input border border-admin-border rounded-lg px-3 py-2 text-sm text-admin-text outline-none"
      >
        <option value="submittedAt">Date</option>
        <option value="respondentName">Name</option>
        <option value="overallExperience">Rating</option>
        <option value="profession">Profession</option>
      </select>
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => setSortDir("asc")}
          className={`flex-1 text-xs py-1.5 rounded border transition-colors ${
            sortDir === "asc"
              ? "bg-admin-gold text-admin-dark border-admin-gold"
              : "border-admin-border text-admin-muted hover:border-admin-gold"
          }`}
        >
          ↑ Asc
        </button>
        <button
          onClick={() => setSortDir("desc")}
          className={`flex-1 text-xs py-1.5 rounded border transition-colors ${
            sortDir === "desc"
              ? "bg-admin-gold text-admin-dark border-admin-gold"
              : "border-admin-border text-admin-muted hover:border-admin-gold"
          }`}
        >
          ↓ Desc
        </button>
      </div>
    </div>

    {/* Filter */}
    <div>
      <h3 className="text-xs font-bold text-admin-gold mb-2 uppercase tracking-wider">Filter</h3>
      <select
        value={filterField}
        onChange={(e) => {
          setFilterField(e.target.value);
          setFilterValue("");
          resetPaginationAndSelection();
        }}
        className="w-full bg-admin-input border border-admin-border rounded-lg px-3 py-2 text-sm text-admin-text outline-none mb-2"
      >
        <option value="">No filter</option>
        <option value="computerId">Computer ID</option>
        <option value="profession">Profession</option>
        <option value="hasTechnicalIssues">Technical Issues</option>
        <option value="overallExperience">Rating</option>
      </select>
      {filterField && (
        filterField === "hasTechnicalIssues" ? (
          <select
            value={filterValue}
            onChange={(e) => {
              setFilterValue(e.target.value);
              resetPaginationAndSelection();
            }}
            className="w-full bg-admin-input border border-admin-border rounded-lg px-3 py-2 text-sm text-admin-text outline-none"
          >
            <option value="">All</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        ) : filterField === "overallExperience" ? (
          <select
            value={filterValue}
            onChange={(e) => {
              setFilterValue(e.target.value);
              resetPaginationAndSelection();
            }}
            className="w-full bg-admin-input border border-admin-border rounded-lg px-3 py-2 text-sm text-admin-text outline-none"
          >
            <option value="">All ratings</option>
            {[5, 4, 3, 2, 1].map((v) => (
              <option key={v} value={String(v)}>
                {"★".repeat(v)} ({v})
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={filterValue}
            onChange={(e) => {
              setFilterValue(e.target.value);
              resetPaginationAndSelection();
            }}
            placeholder="Filter value..."
            className="w-full bg-admin-input border border-admin-border rounded-lg px-3 py-2 text-sm text-admin-text placeholder:text-admin-muted/50 outline-none"
          />
        )
      )}

      <div className="mt-3 space-y-2">
        <div>
          <label className="block text-xs text-slate-700 mb-1">From Date (PHT)</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              resetPaginationAndSelection();
            }}
            className="w-full bg-admin-input border border-admin-border rounded-lg px-3 py-1.5 text-xs text-admin-text outline-none focus:border-admin-gold"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-700 mb-1">To Date (PHT)</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              resetPaginationAndSelection();
            }}
            className="w-full bg-admin-input border border-admin-border rounded-lg px-3 py-1.5 text-xs text-admin-text outline-none focus:border-admin-gold"
          />
        </div>
      </div>

      {hasActiveFilters && (
        <button
          onClick={() => {
            setSearch("");
            setFilterField("");
            setFilterValue("");
            setDateFrom("");
            setDateTo("");
            resetPaginationAndSelection();
          }}
          className="bg-admin-bg w-full text-xs py-1.5 rounded border border-admin-border text-slate-700 hover:text-admin-gold transition-colors mt-2"
        >
          Clear Active Filters
        </button>
      )}
    </div>

    {/* Admin profile card */}
    <div className="mt-auto">
      <div className="bg-admin-card border border-admin-border rounded-xl p-4 text-center">
        <div className="w-16 h-16 rounded-full bg-admin-dark border-2 border-admin-gold mx-auto mb-3 flex items-center justify-center">
          <PlaceholderImage
            src={ASSETS.adminAvatar}
            alt="Admin"
            width={64}
            height={64}
            className="w-full h-full object-cover rounded-full"
            fallbackText="👤"
            fallbackClassName="rounded-full text-2xl bg-transparent"
          />
        </div>
        <p className="text-admin-gold font-medium text-sm">{adminName}</p>
        <p className="text-admin-muted text-xs">Administrator</p>
      </div>

      <div className="mt-3 space-y-2">
        <button
          onClick={() => router.push("/admin/statistics")}
          className="bg-admin-bg w-full text-xs py-2 rounded-lg border border-admin-border text-admin-muted hover:text-admin-gold hover:border-admin-gold transition-colors"
        >
          📊 Statistics
        </button>
        <button
          onClick={handleLogout}
          className="bg-admin-bg w-full text-xs py-2 rounded-lg border border-admin-border text-admin-muted hover:text-admin-gold hover:border-admin-gold transition-colors"
        >
          ← Back to Login
        </button>
        <button
          onClick={() => setShowExitDialog(true)}
          className="bg-admin-bg w-full text-xs py-2 rounded-lg border border-admin-border text-admin-muted hover:text-red-400 hover:border-red-400 transition-colors"
        >
          ✕ Exit COGNĪTA
        </button>
      </div>
    </div>
  </div>
</div>

          {/* Main content */}
          <div className="flex-1 p-6 overflow-auto">
            {exportError && (
              <div className="mb-4 bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
                <span>⚠️ {exportError}</span>
                <button onClick={() => setExportError("")} className="text-xs underline ml-4">
                  Dismiss
                </button>
              </div>
            )}

            {/* Records table */}
            <div className="bg-admin-panel opacity-85 border border-admin-border rounded-xl backdrop-blur-sm overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-6 py-4 border-b border-admin-border">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-admin-gold font-semibold">
                    Feedback Records
                    <span className="text-admin-muted text-sm ml-2">({total} records)</span>
                  </h2>
                  {selectedIds.length > 0 && (
                    <span className="inline-flex items-center gap-2 text-xs bg-blue-50 text-slate-800 border border-blue-200 rounded-full px-3 py-1 font-medium">
                      {selectedIds.length} selected
                      <button
                        onClick={() => setSelectedIds([])}
                        className="text-red-600 hover:underline font-semibold"
                      >
                        Clear
                      </button>
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleExportExcel("selected")}
                    disabled={selectedIds.length === 0 || exportingMode !== null}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-admin-border bg-admin-card text-admin-text hover:border-[#107C41] hover:bg-[#107C41]/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Export selected checkbox entries to Excel (.xlsx)"
                  >
                    <ExcelIcon className="w-4 h-4" />
                    {exportingMode === "selected" ? "Exporting..." : `Export Selected (${selectedIds.length})`}
                  </button>
                  <button
                    onClick={() => handleExportExcel("filtered")}
                    disabled={exportingMode !== null || loading}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-admin-border bg-admin-card text-admin-text hover:border-[#107C41] hover:bg-[#107C41]/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title={`Export all ${total} record(s) matching active filters across all pages (.xlsx)`}
                  >
                    <ExcelIcon className="w-4 h-4" />
                    {exportingMode === "filtered" ? "Exporting..." : `Export Filtered (${total})`}
                  </button>
                  <button
                    onClick={() => handleExportExcel("all")}
                    disabled={exportingMode !== null}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-[#107C41] bg-[#107C41] text-white hover:bg-[#0c5e31] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Export all feedback records in database regardless of active filters (.xlsx)"
                  >
                    <ExcelIcon className="w-4 h-4" />
                    {exportingMode === "all" ? "Exporting..." : "Export All (.xlsx)"}
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="py-20 text-center text-admin-muted">Loading records...</div>
              ) : records.length === 0 ? (
                <div className="py-20 text-center text-admin-muted">
                  <p className="text-lg mb-2">No feedback records found.</p>
                  <p className="text-sm">Records will appear here once users submit feedback.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-admin-border text-admin-muted text-xs uppercase tracking-wider">
                      <th className="w-10 px-4 py-3 text-center">
                        <input
                          ref={selectAllRef}
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={toggleSelectAllVisible}
                          aria-label="Select all records on this page"
                          title="Select all records on this page"
                          className="w-4 h-4 rounded accent-[#122B4F] cursor-pointer"
                        />
                      </th>
                      <th className="text-left px-6 py-3">Name</th>
                      <th className="text-left px-4 py-3">Rating</th>
                      <th className="text-left px-4 py-3">Profession</th>
                      <th className="text-left px-4 py-3">Date</th>
                      <th className="text-center px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => {
                      const isChecked = selectedIds.includes(record.id);
                      return (
                      <tr
                        key={record.id}
                        onClick={() => {
                          setSelectedRecord(record);
                          setDeleteSuccess(false);
                        }}
                        className={`border-b border-admin-border/50 cursor-pointer transition-colors ${
                          selectedRecord?.id === record.id
                            ? "bg-admin-selected"
                            : isChecked
                            ? "bg-blue-50/80 hover:bg-admin-hover/50"
                            : "hover:bg-admin-hover/50"
                        }`}
                      >
                        <td
                          className="w-10 px-4 py-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectRecord(record.id)}
                            aria-label={`Select feedback record from ${record.respondentName || "Anonymous"}`}
                            className="w-4 h-4 rounded accent-[#122B4F] cursor-pointer"
                          />
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-admin-dark flex items-center justify-center text-admin-gold text-xs font-bold">
                              {(record.respondentName || "A").charAt(0).toUpperCase()}
                            </div>
                            <span className="text-admin-text text-sm">
                              {record.respondentName || "Anonymous"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StarRating
                            value={record.overallExperience || 0}
                            readOnly
                            size="sm"
                          />
                        </td>
                        <td className="px-4 py-3 text-admin-muted text-sm">
                          {record.profession || "—"}
                        </td>
                        <td className="px-4 py-3 text-admin-muted text-sm">
                          {formatDate(record.submittedAt)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportWord(record.id);
                            }}
                            className="p-1.5 rounded border border-admin-border hover:border-[#2B579A] hover:bg-[#2B579A]/10 transition-colors"
                            title="Export to Word"
                          >
                            <WordIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportPdf(record.id);
                            }}
                            className="p-1.5 rounded border border-admin-border hover:border-[#E4252A] hover:bg-[#E4252A]/10 transition-colors"
                            title="Export to PDF"
                          >
                            <PdfIcon className="w-4 h-4" />
                          </button>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-admin-border">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="text-xs px-4 py-2 rounded border border-admin-border text-admin-muted hover:text-admin-gold disabled:opacity-30 transition-colors"
                  >
                    ← Previous
                  </button>
                  <span className="text-admin-muted text-xs">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className="text-xs px-4 py-2 rounded border border-admin-border text-admin-muted hover:text-admin-gold disabled:opacity-30 transition-colors"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>

            {/* Selected record details panel */}
            {selectedRecord && (
              <div className="mt-6 bg-admin-panel border border-admin-border rounded-xl p-6 backdrop-blur-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-admin-dark border-2 border-admin-gold flex items-center justify-center text-admin-gold text-xl font-bold">
                      {(selectedRecord.respondentName || "A").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-admin-gold font-semibold text-lg">
                        {selectedRecord.respondentName || "Anonymous"}
                      </h3>
                      <p className="text-admin-muted text-sm">
                        {selectedRecord.profession || "No profession specified"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-admin-muted text-xs">Submitted</p>
                    <p className="text-admin-text text-sm">{formatDate(selectedRecord.submittedAt)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-admin-card rounded-lg p-3 border border-admin-border/50">
                    <p className="text-admin-muted text-xs mb-1">Overall Rating</p>
                    <StarRating value={selectedRecord.overallExperience || 0} readOnly size="sm" />
                  </div>
                  <div className="bg-admin-card rounded-lg p-3 border border-admin-border/50">
                    <p className="text-admin-muted text-xs mb-1">Recommendation</p>
                    <p className="text-admin-gold font-bold">{selectedRecord.recommendationLikelihood ?? 0}/10</p>
                  </div>
                  <div className="bg-admin-card rounded-lg p-3 border border-admin-border/50">
                    <p className="text-admin-muted text-xs mb-1">Technical Issues</p>
                    <p className={`text-sm font-medium ${selectedRecord.hasTechnicalIssues ? "text-red-400" : "text-green-400"}`}>
                      {selectedRecord.hasTechnicalIssues ? "Yes" : "No"}
                    </p>
                  </div>
                </div>

                {selectedRecord.likedMost && (
                  <div className="bg-admin-card rounded-lg p-3 border border-admin-border/50 mb-3">
                    <p className="text-admin-muted text-xs mb-1">Liked Most</p>
                    <p className="text-admin-text text-sm">{selectedRecord.likedMost}</p>
                  </div>
                )}

                {selectedRecord.mostImportantImprovement && (
                  <div className="bg-admin-card rounded-lg p-3 border border-admin-border/50 mb-4">
                    <p className="text-admin-muted text-xs mb-1">Most Important Improvement</p>
                    <p className="text-admin-text text-sm">{selectedRecord.mostImportantImprovement}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      setShowFullDetails(true);
                      setDetailPage(0);
                    }}
                    className="px-4 py-2 text-sm rounded-lg border border-admin-gold text-admin-gold hover:bg-admin-gold hover:text-admin-dark transition-colors"
                  >
                    View Full Details
                  </button>
                  <button
                      onClick={() => handleExportWord(selectedRecord.id)}
                      className="px-4 py-2 text-sm rounded-lg border border-admin-border text-admin-muted hover:border-[#2B579A] hover:text-[#2B579A] transition-colors inline-flex items-center gap-2"
                    >
                      <WordIcon className="w-4 h-4" />
                      Export Word
                  </button>
                    <button
                      onClick={() => handleExportPdf(selectedRecord.id)}
                      className="px-4 py-2 text-sm rounded-lg border border-admin-border text-admin-muted hover:border-[#E4252A] hover:text-[#E4252A] transition-colors inline-flex items-center gap-2"
                    >
                      <PdfIcon className="w-4 h-4" />
                      Export PDF
                  </button>
                  <button
                    onClick={() => setShowDeleteDialog(true)}
                    className="px-4 py-2 text-sm rounded-lg border border-red-600 text-red-400 hover:bg-red-600 hover:text-white transition-colors inline-flex items-center gap-2 ml-auto "
                  >
                    <TrashIcon className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-admin-panel border-2 border-admin-border rounded-2xl p-8 max-w-md w-full mx-4 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-admin-gold font-serif text-xl font-bold mb-2">
              Confirm Deletion
            </h3>
            <p className="text-admin-muted text-sm mb-6">
              Are you sure you want to permanently delete the feedback record from{" "}
              <span className="text-admin-gold">
                {selectedRecord?.respondentName || "Anonymous"}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="px-6 py-2 rounded-lg border border-admin-border text-admin-muted hover:text-admin-gold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-6 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete success dialog */}
      {deleteSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-admin-panel border-2 border-admin-gold rounded-2xl p-8 max-w-md w-full mx-4 text-center">
            <div className="text-4xl mb-4">✅</div>
            <h3 className="text-admin-gold font-serif text-xl font-bold mb-2">
              Record Deleted
            </h3>
            <p className="text-admin-muted text-sm mb-6">
              The feedback record has been permanently deleted from the database.
            </p>
            <button
              onClick={() => setDeleteSuccess(false)}
              className="px-6 py-2 rounded-lg border border-admin-gold text-admin-gold hover:bg-admin-gold hover:text-admin-dark transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Exit confirmation dialog */}
      {showExitDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-admin-panel border-2 border-admin-border rounded-2xl p-8 max-w-md w-full mx-4 text-center">
            <h3 className="text-admin-gold font-serif text-xl font-bold mb-2">
              Exit COGNĪTA
            </h3>
            <p className="text-admin-muted text-sm mb-6">
              Are you sure you want to exit? You will be logged out and returned to the welcome page.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowExitDialog(false)}
                className="px-6 py-2 rounded-lg border border-admin-border text-admin-muted hover:text-admin-gold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-6 py-2 rounded-lg bg-admin-gold text-admin-dark font-semibold hover:bg-yellow-500 transition-colors"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Full Record View Component
function FullRecordView({
  record,
  detailPage,
  setDetailPage,
  onClose,
  onExportWord,
  onExportPdf,
  onDelete,
}: {
  record: FeedbackRecord;
  detailPage: number;
  setDetailPage: (p: number) => void;
  onClose: () => void;
  onExportWord: () => void;
  onExportPdf: () => void;
  onDelete: () => void;
}) {
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-PH", {
      timeZone: "Asia/Manila", year: "numeric", month: "long", day: "numeric",
    });

  const starLabel = (v: number | null) => {
    if (!v) return "N/A";
    const labels = ["", "Very Dissatisfied", "Dissatisfied", "Neutral", "Satisfied", "Very Satisfied"];
    return labels[v] || String(v);
  };

  const detailPages = 4;

  return (
    <div className="min-h-screen bg-admin-bg relative">
      <div className="absolute inset-0 opacity-10">
        <PlaceholderImage
          src={ASSETS.adminBackground}
          alt=""
          className="w-full h-full object-cover"
          fallbackText=""
          fallbackClassName="bg-admin-dark"
        />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="bg-admin-dark/80 border-b border-admin-border px-6 py-3 flex items-center justify-between backdrop-blur-sm">
          <h1 className="text-2xl font-serif font-bold text-admin-gold tracking-wider">
            COGNĪTA
          </h1>
          <button
            onClick={onClose}
            className=" bg-admin-bg text-admin-muted hover:text-admin-gold text-sm border border-admin-border rounded-lg px-4 py-1.5 transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>

        <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
          {/* Record header */}
          <div className="bg-admin-panel/90 border border-admin-border rounded-xl p-6 mb-6 backdrop-blur-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-admin-dark border-2 border-admin-gold flex items-center justify-center text-admin-gold text-2xl font-bold">
                {(record.respondentName || "A").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="text-admin-gold font-semibold text-xl">
                  {record.respondentName || "Anonymous"}
                </h2>
                <p className="text-admin-muted text-sm">{record.profession || "No profession"}</p>
              </div>
              <div className="text-right">
                <p className="text-admin-muted text-xs">Overall Rating</p>
                <StarRating value={record.overallExperience || 0} readOnly size="sm" />
                <p className="text-admin-muted text-xs mt-1">{formatDate(record.submittedAt)}</p>
              </div>
            </div>
            <div className="flex gap-3 text-sm">
              <span className="text-admin-muted">Cleanliness: {starLabel(record.cleanlinessSatisfaction)}</span>
              <span className="text-admin-muted">|</span>
              <span className="text-admin-muted">Recommendation: {record.recommendationLikelihood ?? 0}/10</span>
              <span className="text-admin-muted">|</span>
              <span className="text-admin-muted">Computer: {record.computerId || "N/A"}</span>
            </div>
          </div>

          {/* Detail pages */}
          <div className="bg-admin-panel/90 border border-admin-border rounded-xl p-6 backdrop-blur-sm min-h-[400px]">
            {detailPage === 0 && (
              <div>
                <h3 className="text-admin-gold font-bold text-lg mb-4 uppercase tracking-wider">
                  Computers and Equipment
                </h3>
                <div className="space-y-3">
                  <DetailRatingRow label="1. Performance of the computers" value={record.computerPerformance} />
                  <DetailRatingRow label="2. Quality and condition of the monitors" value={record.monitorQuality} />
                  <DetailRatingRow label="3. Ease of use of equipment" value={record.equipmentEaseOfUse} />
                  <DetailRatingRow label="4. Availability of equipment" value={record.equipmentAvailability} />
                </div>

                <h3 className="text-admin-gold font-bold text-lg mb-4 mt-8 uppercase tracking-wider">
                  Training Room Environment
                </h3>
                <div className="space-y-3">
                  <DetailRatingRow label="1. Noise level" value={record.noiseLevel} />
                  <DetailRatingRow label="2. Cleanliness of PCs, desks, equipment" value={record.equipmentCleanliness} />
                  <DetailRatingRow label="3. Arrangement suitability" value={record.arrangementSuitability} />
                  <DetailRatingRow label="4. Comfort and concentration" value={record.concentrationComfort} />
                </div>
              </div>
            )}

            {detailPage === 1 && (
              <div>
                <h3 className="text-admin-gold font-bold text-lg mb-4 uppercase tracking-wider">
                  Comfort and Room Conditions
                </h3>
                <div className="space-y-3">
                  <DetailRatingRow label="1. Chair comfort" value={record.chairComfort} />
                  <DetailRatingRow label="2. Room temperature" value={record.roomTemperature} />
                  <DetailRatingRow label="3. Air-conditioning and ventilation" value={record.airConditioning} />
                  <DetailRatingRow label="4. Lighting" value={record.lighting} />
                  <DetailRatingRow label="5. Workspace space" value={record.workspaceSpace} />
                </div>

                <h3 className="text-admin-gold font-bold text-lg mb-4 mt-8 uppercase tracking-wider">
                  Technical Issues
                </h3>
                <div className="bg-admin-card rounded-lg p-4 border border-admin-border/50">
                  <p className="text-admin-muted text-sm mb-2">
                    Technical problems reported:{" "}
                    <span className={record.hasTechnicalIssues ? "text-red-400" : "text-green-400"}>
                      {record.hasTechnicalIssues ? "Yes" : "No"}
                    </span>
                  </p>
                  {record.hasTechnicalIssues && record.technicalIssueDescription && (
                    <p className="text-admin-text text-sm">{record.technicalIssueDescription}</p>
                  )}
                </div>
              </div>
            )}

            {detailPage === 2 && (
              <div>
                <h3 className="text-admin-gold font-bold text-lg mb-4 uppercase tracking-wider">
                  Feedback
                </h3>
                <DetailTextBlock label="What did you like most about the training room?" value={record.likedMost} />
                <DetailTextBlock label="What equipment, facilities, or features would you like to see added?" value={record.featuresWanted} />
              </div>
            )}

            {detailPage === 3 && (
              <div>
                <h3 className="text-admin-gold font-bold text-lg mb-4 uppercase tracking-wider">
                  Proposed Improvements
                </h3>
                <DetailTextBlock label="If you could change/improve one thing, what would it be?" value={record.changeImprovement} />
                <DetailTextBlock label="What is the single most important improvement?" value={record.mostImportantImprovement} />
              </div>
            )}
          </div>

          {/* Navigation and actions */}
          <div className="flex items-center justify-between mt-6">
            <div className="flex gap-3">
              <button
                disabled={detailPage === 0}
                onClick={() => setDetailPage(detailPage - 1)}
                className="bg-admin-bg px-4 py-2 text-sm rounded-lg border border-admin-border text-admin-muted hover:text-admin-gold disabled:opacity-30 transition-colors"
              >
                ← Previous Page
              </button>
              <span className="text-admin-muted text-sm flex items-center">
                Page {detailPage + 1} of {detailPages}
              </span>
              <button
                disabled={detailPage >= detailPages - 1}
                onClick={() => setDetailPage(detailPage + 1)}
                className="bg-admin-bg px-4 py-2 text-sm rounded-lg border border-admin-border text-admin-muted hover:text-admin-gold disabled:opacity-30 transition-colors"
              >
                Next Page →
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onExportWord}
                className="bg-admin-bg px-4 py-2 text-sm rounded-lg border border-admin-border text-admin-muted hover:border-[#2B579A] hover:text-[#2B579A] transition-colors inline-flex items-center gap-2"
              >
                  <WordIcon className="w-4 h-4" />
                   Export Word
              </button>
              <button
                onClick={onExportPdf}
                className="bg-admin-bg px-4 py-2 text-sm rounded-lg border border-admin-border text-admin-muted hover:border-[#E4252A] hover:text-[#E4252A] transition-colors inline-flex items-center gap-2"
              >
                <PdfIcon className="w-4 h-4" />
                  Export PDF
              </button>
              <button
                onClick={onDelete}
                className="bg-admin-bg px-4 py-2 text-sm rounded-lg border border-red-600 text-red-400 hover:bg-red-600 hover:text-white transition-colors inline-flex items-center gap-2"
              >
                <TrashIcon className="w-4 h-4" />
                Delete

              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRatingRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 bg-admin-card/50 rounded-lg border border-admin-border/30">
      <span className="text-admin-text text-sm">{label}</span>
      <StarRating value={value || 0} readOnly size="sm" />
    </div>
  );
}

function DetailTextBlock({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="bg-admin-card rounded-lg p-4 border border-admin-border/50 mb-4">
      <p className="text-admin-gold text-sm font-medium mb-2">{label}</p>
      <p className="text-admin-text text-sm leading-relaxed">
        {value || "No response provided."}
      </p>
    </div>
  );
}
