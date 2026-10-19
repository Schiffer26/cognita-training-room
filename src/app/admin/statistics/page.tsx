"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ASSETS } from "@/config/assets";
import PlaceholderImage from "@/components/PlaceholderImage";
import StarRating from "@/components/StarRating";

export default function StatisticsPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [showExitDialog, setShowExitDialog] = useState(false);

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [computerId, setComputerId] = useState("");
  const [availableComputers, setAvailableComputers] = useState<string[]>([]);

  // Export states
  const [exportingWord, setExportingWord] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
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

  useEffect(() => {
    if (authenticated) {
      fetchStats();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, dateFrom, dateTo, computerId]);

  const fetchStats = async () => {
    setLoading(true);
    setExportError("");
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);
      if (computerId) params.append("computerId", computerId);

      const res = await fetch(`/api/statistics?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
        if (data.data.computers) {
          setAvailableComputers(data.data.computers);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  const handleExport = async (format: "word" | "pdf") => {
    setExportError("");
    if (format === "word") setExportingWord(true);
    if (format === "pdf") setExportingPdf(true);

    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);
      if (computerId) params.append("computerId", computerId);

      const res = await fetch(`/api/export/statistics/${format}?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to generate ${format.toUpperCase()} report.`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = format === "word" ? "docx" : "pdf";
      a.download = `COGNITA_Statistics_Report_${new Date().toISOString().split('T')[0]}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setExportError(err.message || "An unexpected error occurred during export.");
    } finally {
      setExportingWord(false);
      setExportingPdf(false);
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
  const techPercent = total > 0 ? Math.round(((stats?.tech_issue_count || 0) / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-admin-bg relative">
      {/* Background image */}
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
        <div className="bg-admin-dark border-b border-admin-border px-6 py-3 flex items-center justify-between backdrop-blur-sm">
          <h1 className="text-2xl font-serif font-bold text-admin-gold tracking-wider">
            COGNĪTA
          </h1>
        </div>

        <div className="flex flex-1">
          {/* Sidebar */}
          <div className="w-64 bg-admin-panel/90 border-r border-admin-border p-4 flex flex-col gap-4 backdrop-blur-sm shrink-0">
            {/* Filters */}
            <div>
              <h3 className="text-xs font-bold text-admin-gold mb-2 uppercase tracking-wider">Filters</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-admin-muted mb-1">From Date</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full bg-admin-input border border-admin-border rounded-lg px-3 py-2 text-sm text-admin-text outline-none focus:border-admin-gold"
                  />
                </div>
                <div>
                  <label className="block text-xs text-admin-muted mb-1">To Date</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full bg-admin-input border border-admin-border rounded-lg px-3 py-2 text-sm text-admin-text outline-none focus:border-admin-gold"
                  />
                </div>
                <div>
                  <label className="block text-xs text-admin-muted mb-1">Computer</label>
                  <select
                    value={computerId}
                    onChange={(e) => setComputerId(e.target.value)}
                    className="w-full bg-admin-input border border-admin-border rounded-lg px-3 py-2 text-sm text-admin-text outline-none focus:border-admin-gold"
                  >
                    <option value="">All Computers</option>
                    {availableComputers.map(c => (
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
                    className="w-full text-xs py-1.5 rounded border border-admin-border text-admin-muted hover:text-admin-gold transition-colors mt-2"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            <div className="mt-auto">
              <div className="bg-admin-card border border-admin-border rounded-xl p-4 text-center">
                <div className="w-16 h-16 rounded-full bg-admin-dark border-2 border-admin-gold mx-auto mb-3 flex items-center justify-center">
                  <PlaceholderImage
                    src={ASSETS.adminAvatar}
                    alt="Admin"
                    width={48}
                    height={48}
                    className="rounded-full"
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
                  className="w-full text-xs py-2 rounded-lg border border-admin-border text-admin-muted hover:text-admin-gold hover:border-admin-gold transition-colors"
                >
                  📋 Dashboard
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-xs py-2 rounded-lg border border-admin-border text-admin-muted hover:text-admin-gold hover:border-admin-gold transition-colors"
                >
                  ← Back to Login
                </button>
                <button
                  onClick={() => setShowExitDialog(true)}
                  className="w-full text-xs py-2 rounded-lg border border-admin-border text-admin-muted hover:text-red-400 hover:border-red-400 transition-colors"
                >
                  ✕ Exit COGNĪTA
                </button>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 p-6 overflow-auto">
            <div className="bg-admin-panel/90 border border-admin-border rounded-xl backdrop-blur-sm overflow-hidden p-8 max-w-5xl mx-auto">

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <h2 className="text-admin-gold font-semibold text-2xl tracking-wide">
                  Feedback Statistics
                </h2>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => handleExport("word")}
                    disabled={exportingWord || loading || total === 0}
                    className="text-sm text-admin-text bg-admin-card border border-admin-border rounded px-4 py-2 hover:bg-admin-hover hover:text-admin-gold transition-colors disabled:opacity-50"
                  >
                    {exportingWord ? "⏳ Exporting..." : "📝 Export to Word (.docx)"}
                  </button>
                  <button
                    onClick={() => handleExport("pdf")}
                    disabled={exportingPdf || loading || total === 0}
                    className="text-sm text-admin-text bg-admin-card border border-admin-border rounded px-4 py-2 hover:bg-admin-hover hover:text-admin-gold transition-colors disabled:opacity-50"
                  >
                    {exportingPdf ? "⏳ Exporting..." : "📄 Export to PDF (.pdf)"}
                  </button>
                  <button
                    onClick={fetchStats}
                    disabled={loading}
                    className="text-xs text-admin-muted border border-admin-border rounded px-3 py-2 hover:bg-admin-hover hover:text-admin-gold transition-colors disabled:opacity-50"
                  >
                    ↻ Refresh
                  </button>
                </div>
              </div>

              {exportError && (
                <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg mb-6 text-sm">
                  ⚠️ {exportError}
                </div>
              )}

              {loading ? (
                <div className="py-20 text-center text-admin-muted">Loading statistics...</div>
              ) : !stats || stats.total_submissions === 0 ? (
                <div className="py-20 text-center text-admin-muted">
                  <p className="text-lg mb-2">No feedback data available for selected filters.</p>
                  <p className="text-sm">Adjust filters or wait for users to submit feedback.</p>
                </div>
              ) : (
                <div className="space-y-10">
                  {/* Top Level Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <StatCard title="Total Submissions" value={stats.total_submissions} />
                    <StatCard title="Avg Overall Rating" value={stats.avg_overall ? `${stats.avg_overall.toFixed(1)} / 5` : "N/A"} />
                    <StatCard title="Avg Recommendation" value={stats.avg_recommendation ? `${stats.avg_recommendation.toFixed(1)} / 10` : "N/A"} />
                    <StatCard title="Technical Issues" value={`${stats.tech_issue_count} (${techPercent}%)`} />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Rating Distribution */}
                    <div>
                      <h3 className="text-admin-gold text-lg mb-4 border-b border-admin-border/30 pb-2">
                        Overall Rating Distribution
                      </h3>
                      <div className="space-y-3">
                        {[5, 4, 3, 2, 1].map((stars) => {
                          const match = stats.distribution?.find((d: any) => d.stars === stars);
                          const count = match ? match.count : 0;
                          const pct = total > 0 ? (count / total) * 100 : 0;
                          return (
                            <div key={stars} className="flex items-center gap-4">
                              <div className="w-16 text-admin-text text-sm flex items-center gap-1">
                                {stars} <span className="text-admin-gold">★</span>
                              </div>
                              <div className="flex-1 bg-admin-dark rounded-full h-3 overflow-hidden border border-admin-border/30">
                                <div className="bg-admin-gold h-full transition-all" style={{ width: `${pct}%` }} />
                              </div>
                              <div className="w-12 text-right text-admin-muted text-sm">{count}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Submission Trends */}
                    <div>
                      <h3 className="text-admin-gold text-lg mb-4 border-b border-admin-border/30 pb-2">
                        Recent Submissions (Last 30 Days)
                      </h3>
                      <div className="bg-admin-card rounded-lg p-4 border border-admin-border/50">
                        {stats.trends?.length > 0 ? (
                          <div className="space-y-2 max-h-48 overflow-y-auto admin-scrollbar">
                            {stats.trends.slice(-7).map((t: any) => (
                              <div key={t.period} className="flex justify-between items-center text-sm border-b border-admin-border/10 pb-1 last:border-0 mb-1">
                                <span className="text-admin-text">{new Date(t.period).toLocaleDateString()}</span>
                                <span className="text-admin-gold font-mono">{t.count} record(s)</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-admin-muted text-sm text-center">No trend data available.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Detailed Averages */}
                  <div>
                    <h3 className="text-admin-gold text-lg mb-4 border-b border-admin-border/30 pb-2">
                      Average Component Ratings
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                      <AvgRow label="Computer Performance" value={stats.avg_computer_performance} />
                      <AvgRow label="Monitor Quality" value={stats.avg_monitor_quality} />
                      <AvgRow label="Equipment Ease of Use" value={stats.avg_equipment_ease} />
                      <AvgRow label="Equipment Availability" value={stats.avg_equipment_availability} />
                      <AvgRow label="Cleanliness Satisfaction" value={stats.avg_cleanliness} />
                      <AvgRow label="Chair Comfort" value={stats.avg_chair_comfort} />
                      <AvgRow label="Room Temperature" value={stats.avg_room_temperature} />
                      <AvgRow label="Air Conditioning" value={stats.avg_air_conditioning} />
                      <AvgRow label="Lighting" value={stats.avg_lighting} />
                      <AvgRow label="Workspace Space" value={stats.avg_workspace} />
                      <AvgRow label="Noise Level" value={stats.avg_noise} />
                      <AvgRow label="Equipment Cleanliness" value={stats.avg_equipment_cleanliness} />
                      <AvgRow label="Arrangement Suitability" value={stats.avg_arrangement} />
                      <AvgRow label="Concentration Comfort" value={stats.avg_concentration} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Exit Dialog */}
      {showExitDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-admin-panel border-2 border-admin-border rounded-2xl p-8 max-w-md w-full mx-4 text-center">
            <h3 className="text-admin-gold font-serif text-xl font-bold mb-2">Exit COGNĪTA</h3>
            <p className="text-admin-muted text-sm mb-6">
              Are you sure you want to exit? You will be logged out.
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

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-admin-card rounded-lg p-5 border border-admin-border/50 text-center shadow-sm">
      <p className="text-admin-muted text-xs mb-3 uppercase tracking-widest">{title}</p>
      <p className="text-admin-gold font-bold text-3xl font-serif">{value}</p>
    </div>
  );
}

function AvgRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-admin-border/10">
      <span className="text-admin-text text-sm">{label}</span>
      <div className="flex items-center gap-3">
        <StarRating value={Math.round(value || 0)} readOnly size="sm" />
        <span className="text-admin-gold font-mono w-8 text-right">
          {value ? value.toFixed(1) : "-"}
        </span>
      </div>
    </div>
  );
}
