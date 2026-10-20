"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ASSETS } from "@/config/assets";
import PlaceholderImage from "@/components/PlaceholderImage";
import StarRating from "@/components/StarRating";
import type { ComputedStatisticsData } from "@/lib/statistics-analytics";
import type { CommentBucketAnalysis } from "@/lib/comment-analysis";

function WordIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="2" width="18" height="20" rx="2" fill="#2B579A" />
      <path d="M7.2 17L9.1 7h2.1l1.35 6.3L14 7h2.1L18 17h-1.9l-.85-5.4L13.8 17h-1.7l-1.4-5.4L10 17H7.2z" fill="white" />
    </svg>
  );
}

function PdfIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill="#E4252A" />
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
      <path d="M8.2 7h2.4l1.4 3.1L13.4 7h2.4l-2.5 4.9L16 17h-2.4l-1.6-3.4L10.4 17H8l2.7-5.1L8.2 7z" fill="white" />
    </svg>
  );
}

export default function StatisticsPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ComputedStatisticsData | null>(null);
  const [showExitDialog, setShowExitDialog] = useState(false);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [computerId, setComputerId] = useState("");
  const [availableComputers, setAvailableComputers] = useState<string[]>([]);

  const [exportingWord, setExportingWord] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportError, setExportError] = useState("");

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

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setExportError("");
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);
      if (computerId) params.append("computerId", computerId);

      const res = await fetch(`/api/statistics?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.data) {
        setStats(data.data);
        if (data.data.computers) setAvailableComputers(data.data.computers);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [dateFrom, dateTo, computerId]);

  useEffect(() => {
    if (!authenticated) return;
    let active = true;
    const params = new URLSearchParams();
    if (dateFrom) params.append("dateFrom", dateFrom);
    if (dateTo) params.append("dateTo", dateTo);
    if (computerId) params.append("computerId", computerId);

    fetch(`/api/statistics?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.success && data.data) {
          setStats(data.data);
          if (data.data.computers) setAvailableComputers(data.data.computers);
        }
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authenticated, dateFrom, dateTo, computerId]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  const handleExport = async (format: "word" | "pdf" | "excel") => {
    setExportError("");
    if (format === "word") setExportingWord(true);
    if (format === "pdf") setExportingPdf(true);
    if (format === "excel") setExportingExcel(true);

    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);
      if (computerId) params.append("computerId", computerId);

      const res = await fetch(`/api/export/statistics/${format}?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Failed to generate ${format.toUpperCase()} report.`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = format === "word" ? "docx" : format === "pdf" ? "pdf" : "xlsx";
      const manilaDate = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
      a.download = `COGNITA_Statistics_Report_${manilaDate}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setExportError(err instanceof Error ? err.message : "An unexpected error occurred during export.");
    } finally {
      setExportingWord(false);
      setExportingPdf(false);
      setExportingExcel(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-admin-bg flex items-center justify-center">
        <div className="text-admin-gold text-lg">Loading...</div>
      </div>
    );
  }

  const total = stats?.total_submissions || 0;
  const techSampleSize = stats?.tech_sample_size ?? total;
  const techPercent = techSampleSize > 0 ? Math.round(((stats?.tech_issue_count || 0) / techSampleSize) * 100) : 0;
  const anyExporting = exportingWord || exportingPdf || exportingExcel;

  const formattedNps =
    stats?.nps?.available && stats.nps.score !== null
      ? `${stats.nps.score > 0 ? "+" : ""}${stats.nps.score.toFixed(1)}`
      : "N/A";

  const maxNpsScoreBucket = Math.max(1, ...(stats?.nps?.scoreDistribution?.map((b) => b.count) || [1]));
  const maxTrendCount = Math.max(1, ...(stats?.trends?.map((t) => t.count) || [1]));

  return (
    <div className="min-h-screen bg-admin-bg relative">
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <PlaceholderImage src={ASSETS.adminBackground} alt="" className="w-full h-full object-cover" fallbackText="" fallbackClassName="bg-admin-dark" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        <div className="bg-admin-dark border-b border-admin-border px-6 py-3 flex items-center justify-between backdrop-blur-sm">
          <h1 className="text-2xl font-serif font-bold text-admin-gold tracking-wider">COGNĪTA</h1>
          <span className="text-xs text-amber-200/90 hidden sm:inline">
            Training Room Analytics & Written-Feedback Intelligence
          </span>
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
            <div className="relative z-10 flex flex-col gap-4 h-full flex-1">
              <div>
                <h3 className="text-xs font-bold text-admin-gold mb-2 uppercase tracking-wider">Filters</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">From Date (PHT)</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full bg-admin-input border border-admin-border rounded-lg px-3 py-2 text-sm text-admin-text outline-none focus:border-admin-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">To Date (PHT)</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full bg-admin-input border border-admin-border rounded-lg px-3 py-2 text-sm text-admin-text outline-none focus:border-admin-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Computer</label>
                    <select
                      value={computerId}
                      onChange={(e) => setComputerId(e.target.value)}
                      className="w-full bg-admin-input border border-admin-border rounded-lg px-3 py-2 text-sm text-admin-text outline-none focus:border-admin-gold"
                    >
                      <option value="">All Computers</option>
                      {availableComputers.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  {(dateFrom || dateTo || computerId) && (
                    <button
                      onClick={() => {
                        setDateFrom("");
                        setDateTo("");
                        setComputerId("");
                      }}
                      className="bg-admin-bg w-full text-xs py-1.5 rounded border border-admin-border text-slate-700 hover:text-admin-gold transition-colors mt-2"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
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
                    onClick={() => router.push("/admin")}
                    className="bg-admin-bg w-full text-xs py-2 rounded-lg border border-admin-border text-admin-muted hover:text-admin-gold hover:border-admin-gold transition-colors"
                  >
                    📋 Dashboard
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
            <div className="bg-admin-panel/95 border border-admin-border rounded-xl backdrop-blur-sm overflow-hidden p-6 md:p-8 max-w-6xl mx-auto">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-admin-gold font-semibold text-2xl tracking-wide">Feedback Statistics</h2>
                  <p className="text-xs text-slate-600 mt-1">
                    {dateFrom || dateTo || computerId
                      ? `Filtered scope (Asia/Manila): ${dateFrom || "Start"} → ${dateTo || "Present"}${computerId ? ` · Workstation ${computerId}` : ""}`
                      : "Showing all recorded training room submissions across all workstations"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => handleExport("excel")}
                    disabled={anyExporting || loading}
                    className="inline-flex items-center gap-2 text-sm font-medium text-admin-text bg-admin-card border border-admin-border rounded-lg px-4 py-2 hover:bg-admin-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ExcelIcon className="w-4 h-4" />
                    {exportingExcel ? "Exporting..." : "Export to Excel (.xlsx)"}
                  </button>
                  <button
                    onClick={() => handleExport("word")}
                    disabled={anyExporting || loading || total === 0}
                    className="inline-flex items-center gap-2 text-sm text-admin-text bg-admin-card border border-admin-border rounded-lg px-4 py-2 hover:bg-admin-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <WordIcon className="w-4 h-4" />
                    {exportingWord ? "Exporting..." : "Export to Word (.docx)"}
                  </button>
                  <button
                    onClick={() => handleExport("pdf")}
                    disabled={anyExporting || loading || total === 0}
                    className="inline-flex items-center gap-2 text-sm text-admin-text bg-admin-card border border-admin-border rounded-lg px-4 py-2 hover:bg-admin-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PdfIcon className="w-4 h-4" />
                    {exportingPdf ? "Exporting..." : "Export to PDF (.pdf)"}
                  </button>
                  <button
                    onClick={fetchStats}
                    disabled={loading}
                    className="text-xs text-slate-700 border border-admin-border rounded-lg px-3 py-2 hover:bg-admin-hover transition-colors disabled:opacity-50"
                  >
                    ↻ Refresh
                  </button>
                </div>
              </div>

              {exportError && (
                <div className="bg-red-50 border border-red-300 text-red-800 p-4 rounded-lg mb-6 text-sm">
                  ⚠️ {exportError}
                </div>
              )}

              {loading ? (
                <div className="py-20 text-center text-slate-600">Loading statistics...</div>
              ) : !stats || stats.total_submissions === 0 ? (
                <div className="py-16 text-center text-slate-600 border border-dashed border-admin-border/60 rounded-xl bg-admin-card/60 p-8">
                  <p className="text-lg font-medium text-admin-text mb-2">
                    No feedback data available for the selected filters.
                  </p>
                  <p className="text-sm mb-4">
                    Adjust the date or computer filters in the sidebar, or wait for new survey submissions. You can still export an empty summary report via <strong>Export to Excel (.xlsx)</strong>.
                  </p>
                  <div className="inline-flex items-center gap-4 text-xs text-slate-500 bg-white px-4 py-2 rounded-full border border-slate-200">
                    <span>Total Submissions: n = 0</span>
                    <span>•</span>
                    <span>Overall Satisfaction: N/A</span>
                    <span>•</span>
                    <span>NPS: N/A</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-10">
                  {/* 1. Executive Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <StatCard
                      title="Total Submissions"
                      value={stats.total_submissions}
                      subtitle={`${stats.commentAnalysis.recordsWithAnySubstantiveComment} with written comments`}
                    />
                    <StatCard
                      title="Overall Satisfaction"
                      value={stats.avg_overall !== null ? `${stats.avg_overall.toFixed(2)} / 5` : "N/A"}
                      subtitle={`n = ${stats.overallSentiment.sampleSize} rated`}
                    />
                    <StatCard
                      title="Positive Experience"
                      value={`${stats.overallSentiment.positivePct.toFixed(1)}%`}
                      subtitle={`${stats.overallSentiment.positiveCount} of ${stats.overallSentiment.sampleSize} rated 4–5★`}
                    />
                    <StatCard
                      title="Net Promoter Score"
                      value={formattedNps}
                      subtitle={
                        stats.avg_recommendation !== null
                          ? `Avg ${stats.avg_recommendation.toFixed(1)}/10 · n = ${stats.nps.sampleSize}`
                          : `n = ${stats.nps.sampleSize}`
                      }
                    />
                    <StatCard
                      title="Technical Issues"
                      value={`${stats.tech_issue_count} (${techPercent}%)`}
                      subtitle={`n = ${techSampleSize} answered`}
                    />
                  </div>

                  {/* 2. Automated Data Insights */}
                  {stats.insights && stats.insights.length > 0 && (
                    <section className="bg-slate-50 border border-admin-border/60 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-[#122B4F]">Automated Key Insights</h3>
                        <span className="text-xs text-slate-500">Computed directly from filtered responses (n = {total})</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {stats.insights.map((ins, i) => {
                          const toneStyle =
                            ins.tone === "positive"
                              ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                              : ins.tone === "attention"
                              ? "bg-amber-50 border-amber-300 text-amber-950"
                              : "bg-white border-slate-200 text-slate-800";
                          return (
                            <div key={i} className={`rounded-lg border p-3.5 text-sm ${toneStyle}`}>
                              <p className="font-semibold text-xs uppercase tracking-wide mb-1 opacity-85">{ins.title}</p>
                              <p className="leading-relaxed text-xs sm:text-sm">{ins.detail}</p>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {/* 3. Dual Separated Section: Star-Rating Sentiment vs. 0-10 NPS */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <section className="bg-admin-card rounded-xl border border-admin-border/70 p-6 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-admin-border/30 pb-3 mb-4">
                          <div>
                            <h3 className="text-admin-gold font-semibold text-lg">Overall Experience Sentiment & Distribution</h3>
                            <p className="text-xs text-slate-600">
                              Based on <code className="text-xs">overall_experience</code> star ratings (1–5★)
                            </p>
                          </div>
                          <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200">
                            n = {stats.overallSentiment.sampleSize}
                            {stats.overallSentiment.missingCount > 0 ? ` (${stats.overallSentiment.missingCount} missing)` : ""}
                          </span>
                        </div>

                        <div className="mb-4">
                          <div className="w-full h-4 rounded-full overflow-hidden flex bg-slate-200 border border-slate-300/60">
                            {stats.overallSentiment.positivePct > 0 && (
                              <div
                                className="bg-emerald-600 h-full transition-all"
                                style={{ width: `${stats.overallSentiment.positivePct}%` }}
                                title={`Positive (4–5★): ${stats.overallSentiment.positiveCount} (${stats.overallSentiment.positivePct}%)`}
                              />
                            )}
                            {stats.overallSentiment.neutralPct > 0 && (
                              <div
                                className="bg-amber-400 h-full transition-all"
                                style={{ width: `${stats.overallSentiment.neutralPct}%` }}
                                title={`Neutral (3★): ${stats.overallSentiment.neutralCount} (${stats.overallSentiment.neutralPct}%)`}
                              />
                            )}
                            {stats.overallSentiment.negativePct > 0 && (
                              <div
                                className="bg-rose-600 h-full transition-all"
                                style={{ width: `${stats.overallSentiment.negativePct}%` }}
                                title={`Negative (1–2★): ${stats.overallSentiment.negativeCount} (${stats.overallSentiment.negativePct}%)`}
                              />
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2.5 mb-6">
                          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-center">
                            <p className="text-[11px] font-semibold uppercase text-emerald-800">Positive (4–5★)</p>
                            <p className="text-xl font-bold text-emerald-900 mt-1">{stats.overallSentiment.positivePct.toFixed(1)}%</p>
                            <p className="text-xs text-emerald-700">{stats.overallSentiment.positiveCount} resp.</p>
                          </div>
                          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center">
                            <p className="text-[11px] font-semibold uppercase text-amber-800">Neutral (3★)</p>
                            <p className="text-xl font-bold text-amber-900 mt-1">{stats.overallSentiment.neutralPct.toFixed(1)}%</p>
                            <p className="text-xs text-amber-700">{stats.overallSentiment.neutralCount} resp.</p>
                          </div>
                          <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-center">
                            <p className="text-[11px] font-semibold uppercase text-rose-800">Negative (1–2★)</p>
                            <p className="text-xl font-bold text-rose-900 mt-1">{stats.overallSentiment.negativePct.toFixed(1)}%</p>
                            <p className="text-xs text-rose-700">{stats.overallSentiment.negativeCount} resp.</p>
                          </div>
                        </div>

                        <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5">Star-by-Star Distribution</p>
                        <div className="space-y-2.5">
                          {[5, 4, 3, 2, 1].map((stars) => {
                            const match = stats.distribution?.find((d) => d.stars === stars);
                            const count = match ? match.count : 0;
                            const pct = stats.overallSentiment.sampleSize > 0 ? (count / stats.overallSentiment.sampleSize) * 100 : 0;
                            return (
                              <div key={stars} className="flex items-center gap-3">
                                <div className="w-12 text-admin-text text-sm font-medium flex items-center gap-1">
                                  {stars} <span className="text-admin-gold">★</span>
                                </div>
                                <div className="flex-1 bg-slate-200 rounded-full h-3 overflow-hidden">
                                  <div className="bg-admin-gold h-full transition-all" style={{ width: `${pct}%` }} />
                                </div>
                                <div className="w-24 text-right text-slate-700 text-xs font-mono">
                                  {count} ({pct.toFixed(1)}%)
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </section>

                    <section className="bg-admin-card rounded-xl border border-admin-border/70 p-6 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-admin-border/30 pb-3 mb-4">
                          <div>
                            <h3 className="text-admin-gold font-semibold text-lg">Net Promoter Score (NPS) Breakdown</h3>
                            <p className="text-xs text-slate-600">Separate 0–10 recommendation metric (% Promoters − % Detractors)</p>
                          </div>
                          <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200">
                            n = {stats.nps.sampleSize}
                            {stats.nps.missingCount > 0 ? ` (${stats.nps.missingCount} missing)` : ""}
                          </span>
                        </div>

                        {!stats.nps.available ? (
                          <div className="py-12 text-center text-slate-500 text-sm">
                            No valid 0–10 recommendation scores available for the selected filter.
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between bg-[#122B4F] text-white rounded-xl px-5 py-3.5 mb-4">
                              <div>
                                <p className="text-xs uppercase tracking-wider text-amber-200">Net Promoter Score</p>
                                <p className="text-xs text-slate-200 mt-0.5">
                                  Mean likelihood: <strong>{stats.avg_recommendation?.toFixed(2)} / 10</strong>
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="text-3xl font-serif font-bold text-admin-gold">{formattedNps}</span>
                                <span className="block text-[11px] text-slate-300">Scale: −100 to +100</span>
                              </div>
                            </div>

                            <div className="mb-4">
                              <div className="w-full h-4 rounded-full overflow-hidden flex bg-slate-200 border border-slate-300/60">
                                {stats.nps.promotersPct > 0 && (
                                  <div
                                    className="bg-emerald-600 h-full transition-all"
                                    style={{ width: `${stats.nps.promotersPct}%` }}
                                    title={`Promoters (9–10): ${stats.nps.promotersCount} (${stats.nps.promotersPct}%)`}
                                  />
                                )}
                                {stats.nps.passivesPct > 0 && (
                                  <div
                                    className="bg-sky-500 h-full transition-all"
                                    style={{ width: `${stats.nps.passivesPct}%` }}
                                    title={`Passives (7–8): ${stats.nps.passivesCount} (${stats.nps.passivesPct}%)`}
                                  />
                                )}
                                {stats.nps.detractorsPct > 0 && (
                                  <div
                                    className="bg-rose-600 h-full transition-all"
                                    style={{ width: `${stats.nps.detractorsPct}%` }}
                                    title={`Detractors (0–6): ${stats.nps.detractorsCount} (${stats.nps.detractorsPct}%)`}
                                  />
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2.5 mb-6">
                              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-center">
                                <p className="text-[11px] font-semibold uppercase text-emerald-800">Promoters (9–10)</p>
                                <p className="text-xl font-bold text-emerald-900 mt-1">{stats.nps.promotersPct.toFixed(1)}%</p>
                                <p className="text-xs text-emerald-700">{stats.nps.promotersCount} resp.</p>
                              </div>
                              <div className="rounded-lg bg-sky-50 border border-sky-200 p-3 text-center">
                                <p className="text-[11px] font-semibold uppercase text-sky-800">Passives (7–8)</p>
                                <p className="text-xl font-bold text-sky-900 mt-1">{stats.nps.passivesPct.toFixed(1)}%</p>
                                <p className="text-xs text-sky-700">{stats.nps.passivesCount} resp.</p>
                              </div>
                              <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-center">
                                <p className="text-[11px] font-semibold uppercase text-rose-800">Detractors (0–6)</p>
                                <p className="text-xl font-bold text-rose-900 mt-1">{stats.nps.detractorsPct.toFixed(1)}%</p>
                                <p className="text-xs text-rose-700">{stats.nps.detractorsCount} resp.</p>
                              </div>
                            </div>

                            <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">0–10 Score Distribution</p>
                            <div className="grid grid-cols-11 gap-1.5 items-end h-24 pt-4 px-2 bg-slate-50 rounded-lg border border-slate-200">
                              {stats.nps.scoreDistribution.map((bucket) => {
                                const heightPct = bucket.count > 0 ? Math.max(14, Math.round((bucket.count / maxNpsScoreBucket) * 100)) : 4;
                                const barColor = bucket.group === "promoter" ? "bg-emerald-600" : bucket.group === "passive" ? "bg-sky-500" : "bg-rose-500";
                                return (
                                  <div
                                    key={bucket.score}
                                    className="flex flex-col items-center h-full justify-end"
                                    title={`Score ${bucket.score}: ${bucket.count} response(s) (${bucket.pct}%)`}
                                  >
                                    <span className="text-[10px] font-mono text-slate-600 mb-0.5">{bucket.count > 0 ? bucket.count : ""}</span>
                                    <div className="w-full flex items-end justify-center flex-1">
                                      <div className={`w-full max-w-[18px] rounded-t ${bucket.count > 0 ? barColor : "bg-slate-200"}`} style={{ height: `${heightPct}%` }} />
                                    </div>
                                    <span className="text-[11px] font-semibold text-slate-700 mt-1">{bucket.score}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    </section>
                  </div>

                  {/* 4. Core Equipment & Comfort Spotlight Comparison */}
                  <section className="bg-admin-card rounded-xl border border-admin-border/70 p-6 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-admin-border/30 pb-3 mb-5">
                      <div>
                        <h3 className="text-admin-gold font-semibold text-lg">Core Equipment & Comfort Comparison</h3>
                        <p className="text-xs text-slate-600">
                          Side-by-side average ratings (1–5★ scale) for Computers, Monitors, Air Conditioning, and Chairs
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {stats.keyEquipmentComparison.map((item) => {
                        const pctWidth = item.average !== null ? (item.average / 5) * 100 : 0;
                        return (
                          <div key={item.key} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="font-bold text-[#122B4F] text-base">{item.label}</h4>
                                <span className="text-[11px] font-mono text-slate-500">n = {item.sampleSize}</span>
                              </div>
                              <p className="text-xs text-slate-500 mb-3">{item.fieldLabel}</p>
                              <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-2xl font-serif font-bold text-admin-gold">
                                  {item.average !== null ? item.average.toFixed(2) : "N/A"}
                                </span>
                                <span className="text-xs text-slate-500">/ 5.00</span>
                              </div>
                              <StarRating value={Math.round(item.average || 0)} readOnly size="sm" />
                              <div className="w-full bg-slate-200 rounded-full h-2.5 mt-3 overflow-hidden">
                                <div className="bg-[#122B4F] h-full rounded-full transition-all" style={{ width: `${pctWidth}%` }} />
                              </div>
                            </div>

                            <div className="flex justify-between text-[11px] text-slate-600 mt-3 pt-2 border-t border-slate-200">
                              <span className="text-emerald-700 font-medium">4–5★: {item.positivePct.toFixed(0)}%</span>
                              <span className="text-rose-700 font-medium">1–2★: {item.lowPct.toFixed(0)}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {/* 5. Complete Category Ranking: Lowest to Highest (Highlighting Bottom 3) */}
                  <section className="bg-admin-card rounded-xl border border-admin-border/70 p-6 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-admin-border/30 pb-3 mb-5">
                      <div>
                        <h3 className="text-admin-gold font-semibold text-lg">Complete Category Ranking (Lowest to Highest)</h3>
                        <p className="text-xs text-slate-600">
                          All 14 rating categories ordered from lowest average score to highest — highlighting the 3 lowest-rated areas for priority attention
                        </p>
                      </div>
                      <span className="text-xs font-medium bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1 rounded-full">
                        amber highlight = 3 lowest-rated categories
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {stats.categoryRankings.map((cat) => {
                        const barWidth = cat.average !== null ? (cat.average / 5) * 100 : 0;
                        return (
                          <div
                            key={cat.key}
                            className={`rounded-lg px-4 py-3 border transition-colors ${
                              cat.isBottomThree ? "bg-amber-50 border-amber-400 shadow-2xs" : "bg-white border-slate-200/90"
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-3 min-w-0">
                                <span
                                  className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                                    cat.isBottomThree ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-700 border border-slate-300"
                                  }`}
                                >
                                  {cat.rank !== null ? `#${cat.rank}` : "—"}
                                </span>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-semibold text-sm text-admin-text">{cat.label}</span>
                                    {cat.isBottomThree && (
                                      <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-amber-200/80 text-amber-950">
                                        Lowest #{cat.rank} Priority
                                      </span>
                                    )}
                                    <span className="text-xs text-slate-500">· {cat.group}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 shrink-0">
                                <span className="text-xs font-mono text-slate-500">n = {cat.sampleSize}</span>
                                <StarRating value={Math.round(cat.average || 0)} readOnly size="sm" />
                                <span className={`font-mono font-bold text-sm w-14 text-right ${cat.isBottomThree ? "text-amber-900" : "text-[#122B4F]"}`}>
                                  {cat.average !== null ? `${cat.average.toFixed(2)}/5` : "N/A"}
                                </span>
                              </div>
                            </div>

                            <div className="mt-2 flex items-center gap-3">
                              <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${cat.isBottomThree ? "bg-amber-500" : "bg-admin-gold"}`} style={{ width: `${barWidth}%` }} />
                              </div>
                              <span className="text-[11px] text-slate-500 font-mono w-28 text-right">
                                1–2★: {cat.lowCount} ({cat.lowPct.toFixed(0)}%)
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {/* 6. Submission Trends & Workstation Summary */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <section className="bg-admin-card rounded-xl border border-admin-border/70 p-6 shadow-xs">
                      <h3 className="text-admin-gold font-semibold text-lg mb-1 border-b border-admin-border/30 pb-2">Recent Submission Activity</h3>
                      <p className="text-xs text-slate-600 mb-4">
                        Daily submission counts in Philippine Time (Asia/Manila) across up to the last 30 active dates
                      </p>

                      {stats.trends?.length > 0 ? (
                        <>
                          <div className="flex items-end gap-1.5 h-28 bg-slate-50 rounded-lg p-3 border border-slate-200 mb-4 overflow-x-auto">
                            {stats.trends.slice(-14).map((t) => {
                              const barPct = Math.max(14, Math.round((t.count / maxTrendCount) * 100));
                              return (
                                <div key={t.period} className="flex-1 min-w-[28px] h-full flex flex-col items-center justify-end" title={`${t.period} (PHT): ${t.count} record(s)`}>
                                  <span className="text-[10px] font-mono text-slate-700 mb-0.5">{t.count}</span>
                                  <div className="w-full flex-1 flex items-end justify-center">
                                    <div className="w-full max-w-[20px] bg-[#122B4F] rounded-t" style={{ height: `${barPct}%` }} />
                                  </div>
                                  <span className="text-[9px] text-slate-500 mt-1 truncate max-w-full">{t.period.slice(5)}</span>
                                </div>
                              );
                            })}
                          </div>

                          <div className="space-y-1.5 max-h-40 overflow-y-auto admin-scrollbar pr-1">
                            {stats.trends.slice(-7).map((t) => (
                              <div key={t.period} className="flex justify-between items-center text-sm border-b border-slate-100 pb-1 last:border-0">
                                <span className="text-admin-text">{t.period}</span>
                                <span className="text-[#122B4F] font-semibold font-mono text-xs">
                                  {t.count} record{t.count === 1 ? "" : "s"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="text-slate-500 text-sm text-center py-8">No trend data available.</p>
                      )}
                    </section>

                    <section className="bg-admin-card rounded-xl border border-admin-border/70 p-6 shadow-xs">
                      <h3 className="text-admin-gold font-semibold text-lg mb-1 border-b border-admin-border/30 pb-2">Workstation Summary</h3>
                      <p className="text-xs text-slate-600 mb-4">
                        Ratings and reported technical issues grouped by <code className="text-xs">computer_id</code>
                      </p>

                      {stats.computerSummary?.length > 0 ? (
                        <div className="overflow-x-auto max-h-72 overflow-y-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-slate-200 text-slate-600 uppercase">
                                <th className="text-left py-2 pr-2">Computer</th>
                                <th className="text-center py-2 px-2">n</th>
                                <th className="text-center py-2 px-2">Overall</th>
                                <th className="text-center py-2 px-2">PC Perf</th>
                                <th className="text-center py-2 px-2">Monitor</th>
                                <th className="text-right py-2 pl-2">Tech Issues</th>
                              </tr>
                            </thead>
                            <tbody>
                              {stats.computerSummary.map((comp) => (
                                <tr key={comp.computerId} className="border-b border-slate-100 last:border-0">
                                  <td className="py-2 pr-2 font-mono font-semibold text-admin-text">{comp.computerId}</td>
                                  <td className="py-2 px-2 text-center font-mono">{comp.submissions}</td>
                                  <td className="py-2 px-2 text-center font-mono">{comp.avgOverall !== null ? comp.avgOverall.toFixed(1) : "—"}</td>
                                  <td className="py-2 px-2 text-center font-mono">{comp.avgComputerPerformance !== null ? comp.avgComputerPerformance.toFixed(1) : "—"}</td>
                                  <td className="py-2 px-2 text-center font-mono">{comp.avgMonitorQuality !== null ? comp.avgMonitorQuality.toFixed(1) : "—"}</td>
                                  <td className="py-2 pl-2 text-right font-mono">
                                    <span className={comp.techIssueCount > 0 ? "text-rose-700 font-semibold" : "text-emerald-700"}>
                                      {comp.techIssueCount}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-slate-500 text-sm text-center py-8">No workstation records available.</p>
                      )}
                    </section>
                  </div>

                  {/* 7. Automatic Written-Comment Analysis */}
                  <section className="bg-admin-card rounded-xl border border-admin-border/80 p-6 shadow-xs space-y-6">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-admin-border/30 pb-4">
                      <div>
                        <h3 className="text-admin-gold font-semibold text-xl">Automatic Written-Comment Analysis</h3>
                        <p className="text-xs text-slate-600 mt-1">
                          Deterministic server-side phrase & topic analysis across <code className="text-xs">liked_most</code>,{" "}
                          <code className="text-xs">features_wanted</code>, <code className="text-xs">change_improvement</code>,{" "}
                          <code className="text-xs">most_important_improvement</code>, and{" "}
                          <code className="text-xs">technical_issue_description</code> — no external AI service used
                        </p>
                      </div>
                      <span className="text-xs font-mono bg-[#122B4F] text-white px-3 py-1.5 rounded-full">
                        {stats.commentAnalysis.recordsWithAnySubstantiveComment} of {stats.commentAnalysis.totalRecordsAnalyzed} responses with written comments
                      </span>
                    </div>

                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#122B4F] mb-2.5">Key Written-Feedback Findings</h4>
                      <ul className="space-y-2">
                        {stats.commentAnalysis.findings.map((finding, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-800">
                            <span
                              className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                                finding.category === "positive"
                                  ? "bg-emerald-600"
                                  : finding.category === "suggestions"
                                  ? "bg-sky-600"
                                  : finding.category === "technicalIssues"
                                  ? "bg-rose-600"
                                  : "bg-slate-400"
                              }`}
                            />
                            <span>{finding.statement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                      <CommentBucketCard bucket={stats.commentAnalysis.positive} accentClass="border-emerald-300 bg-emerald-50/40" badgeClass="bg-emerald-100 text-emerald-900" barClass="bg-emerald-600" />
                      <CommentBucketCard bucket={stats.commentAnalysis.suggestions} accentClass="border-sky-300 bg-sky-50/40" badgeClass="bg-sky-100 text-sky-900" barClass="bg-sky-600" />
                      <CommentBucketCard bucket={stats.commentAnalysis.technicalIssues} accentClass="border-rose-300 bg-rose-50/40" badgeClass="bg-rose-100 text-rose-900" barClass="bg-rose-600" />
                    </div>

                    <div className="rounded-xl bg-amber-50/70 border border-amber-300/80 p-4 text-xs text-slate-800 space-y-2">
                      <p className="font-bold uppercase tracking-wider text-amber-950">Analysis Method & Interpretive Limitations</p>
                      <p className="leading-relaxed">
                        <strong>Method:</strong> {stats.commentAnalysis.methodology}
                      </p>
                      <ul className="list-disc pl-5 space-y-1 text-slate-700">
                        {stats.commentAnalysis.limitations.map((item, i) => (
                          <li key={i} className="leading-relaxed">{item}</li>
                        ))}
                      </ul>
                    </div>
                  </section>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showExitDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-admin-panel border-2 border-admin-border rounded-2xl p-8 max-w-md w-full mx-4 text-center">
            <h3 className="text-admin-gold font-serif text-xl font-bold mb-2">Exit COGNĪTA</h3>
            <p className="text-slate-700 text-sm mb-6">Are you sure you want to exit? You will be logged out.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowExitDialog(false)}
                className="px-6 py-2 rounded-lg border border-admin-border text-slate-700 hover:text-admin-gold transition-colors"
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

function StatCard({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) {
  return (
    <div className="bg-admin-card rounded-xl p-4 border border-admin-border/60 text-center shadow-2xs flex flex-col justify-between">
      <p className="text-slate-600 text-[11px] font-semibold mb-2 uppercase tracking-wider">{title}</p>
      <p className="text-admin-gold font-bold text-2xl xl:text-3xl font-serif">{value}</p>
      {subtitle && <p className="text-slate-500 text-[11px] mt-2 font-mono">{subtitle}</p>}
    </div>
  );
}

function CommentBucketCard({
  bucket,
  accentClass,
  badgeClass,
  barClass,
}: {
  bucket: CommentBucketAnalysis;
  accentClass: string;
  badgeClass: string;
  barClass: string;
}) {
  return (
    <div className={`rounded-xl border p-4 flex flex-col justify-between ${accentClass}`}>
      <div>
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="font-bold text-sm text-[#122B4F]">{bucket.title}</h4>
          <span className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full shrink-0 ${badgeClass}`}>
            n = {bucket.distinctResponseCount}
          </span>
        </div>
        <p className="text-[11px] text-slate-600 mb-3">{bucket.description}</p>

        {bucket.distinctResponseCount === 0 ? (
          <p className="text-xs text-slate-500 italic py-6 text-center">
            No substantive comments recorded in this category for the active filters.
          </p>
        ) : (
          <div className="space-y-3">
            {bucket.themes.length > 0 ? (
              bucket.themes.slice(0, 5).map((theme) => (
                <div key={theme.id} className="bg-white/95 rounded-lg border border-slate-200 p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-admin-text">{theme.theme}</span>
                    <span className="font-mono text-slate-700 shrink-0">
                      {theme.distinctResponses} ({theme.percentageOfCommented.toFixed(0)}%)
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div className={`h-full rounded-full ${barClass}`} style={{ width: `${Math.min(100, theme.percentageOfCommented)}%` }} />
                  </div>

                  {theme.recurringPhrases.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {theme.recurringPhrases.map((phrase) => (
                        <span key={phrase} className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                          &ldquo;{phrase}&rdquo;
                        </span>
                      ))}
                    </div>
                  )}

                  {theme.examples.length > 0 && (
                    <div className="pt-1 space-y-1 border-t border-slate-100">
                      {theme.examples.slice(0, 2).map((ex, idx) => (
                        <blockquote key={idx} className="text-[11px] text-slate-600 italic leading-snug">
                          &ldquo;{ex.text}&rdquo;{" "}
                          <span className="not-italic text-[10px] text-slate-400">
                            ({ex.sourceField}{ex.computerId ? `, ${ex.computerId}` : ""})
                          </span>
                        </blockquote>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-600 bg-white/80 rounded-lg p-3 border border-slate-200">
                {bucket.distinctResponseCount} comment(s) submitted without matching predefined topic keywords.
              </p>
            )}

            {bucket.recurringPhrases.length > 0 && (
              <div className="pt-2 border-t border-slate-200/80">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Top Multi-Word Phrases</p>
                <div className="flex flex-wrap gap-1.5">
                  {bucket.recurringPhrases.slice(0, 6).map((item) => (
                    <span key={item.phrase} className="text-[11px] bg-white text-slate-800 border border-slate-300 rounded-full px-2.5 py-0.5 font-medium">
                      {item.phrase} <span className="font-mono text-slate-500">({item.distinctResponses})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
