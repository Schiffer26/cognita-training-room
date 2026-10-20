import ExcelJS from "exceljs";
import { formatManilaTimestamp, type FeedbackRecordRow } from "@/lib/feedback-query";
import {
  classifyNpsGroup,
  classifyStarSentiment,
  computeFeedbackStatistics,
  type ComputedStatisticsData,
} from "@/lib/statistics-analytics";
import type { CommentBucketAnalysis } from "@/lib/comment-analysis";

export interface ExcelWorkbookOptions {
  reportTitle: string;
  scopeDescription: string;
  generatedAt?: Date;
}

const BRAND_NAVY = "FF122B4F";
const BRAND_GOLD = "FFD4A843";
const SUBHEADER_BG = "FFEFF6FF";
const TABLE_HEADER_BG = "FF1E3A5F";
const ZEBRA_BG = "FFF8FAFC";
const ALERT_BG = "FFFEF3C7";
const ALERT_BORDER = "FFD97706";
const BORDER_LIGHT = "FFD1D5DB";

/**
 * Neutralizes spreadsheet formula injection in untrusted/user-supplied strings.
 * Any value starting with '=', '+', '-', '@', '|', or tab (including when
 * preceded by leading whitespace) is prefixed with a literal apostrophe (')
 * and stored strictly as an OOXML string value with '@' text formatting.
 */
export function sanitizeExcelText(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  const cleaned = String(value)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

  if (!cleaned) return "";
  if (/^[=+\-@|\t]/.test(cleaned) || /^\s+[=+\-@|]/.test(cleaned)) {
    return `'${cleaned}`;
  }
  return cleaned;
}

function setPlainTextCell(cell: ExcelJS.Cell, rawValue: string | null | undefined, wrapText = false) {
  cell.value = sanitizeExcelText(rawValue);
  cell.numFmt = "@";
  cell.alignment = { vertical: "top", horizontal: "left", wrapText };
}

function setNumericOrNaCell(cell: ExcelJS.Cell, value: number | null | undefined, numFmt = "0") {
  if (typeof value === "number" && !Number.isNaN(value)) {
    cell.value = value;
    cell.numFmt = numFmt;
    cell.alignment = { vertical: "top", horizontal: "center" };
  } else {
    cell.value = "";
    cell.alignment = { vertical: "top", horizontal: "center" };
  }
}

function applyThinBorders(row: ExcelJS.Row, colCount: number, borderArgb = BORDER_LIGHT) {
  for (let c = 1; c <= colCount; c++) {
    row.getCell(c).border = {
      top: { style: "thin", color: { argb: borderArgb } },
      bottom: { style: "thin", color: { argb: borderArgb } },
      left: { style: "thin", color: { argb: borderArgb } },
      right: { style: "thin", color: { argb: borderArgb } },
    };
  }
}

function styleBannerHeader(
  ws: ExcelJS.Worksheet,
  totalCols: number,
  title: string,
  scopeDescription: string,
  generatedAt: Date
) {
  const titleRow = ws.addRow([title]);
  ws.mergeCells(1, 1, 1, totalCols);
  titleRow.height = 28;
  const titleCell = titleRow.getCell(1);
  titleCell.font = { name: "Calibri", size: 15, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_NAVY } };
  titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  titleCell.border = { bottom: { style: "medium", color: { argb: BRAND_GOLD } } };

  const metaText = `Generated: ${formatManilaTimestamp(generatedAt)}  |  Scope: ${sanitizeExcelText(scopeDescription)}`;
  const metaRow = ws.addRow([metaText]);
  ws.mergeCells(2, 1, 2, totalCols);
  metaRow.height = 20;
  const metaCell = metaRow.getCell(1);
  metaCell.numFmt = "@";
  metaCell.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF1E3A5F" } };
  metaCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SUBHEADER_BG } };
  metaCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };

  ws.addRow([]);
}

function addSectionHeader(ws: ExcelJS.Worksheet, title: string, spanCols: number) {
  const row = ws.addRow([title]);
  ws.mergeCells(row.number, 1, row.number, spanCols);
  row.height = 22;
  const cell = row.getCell(1);
  cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF122B4F" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDF6E3" } };
  cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  cell.border = {
    top: { style: "thin", color: { argb: BRAND_GOLD } },
    bottom: { style: "medium", color: { argb: BRAND_GOLD } },
  };
}

function addStyledTableHeader(ws: ExcelJS.Worksheet, headers: string[]) {
  const row = ws.addRow(headers);
  row.height = 22;
  headers.forEach((_, idx) => {
    const cell = row.getCell(idx + 1);
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TABLE_HEADER_BG } };
    cell.alignment = { vertical: "middle", horizontal: idx === 0 ? "left" : "center", wrapText: true };
    cell.border = {
      bottom: { style: "medium", color: { argb: BRAND_GOLD } },
      right: { style: "thin", color: { argb: "FF3B5998" } },
    };
  });
  return row;
}

function formatTimestampManila(value: Date | string | null | undefined): string {
  if (!value) return "";
  return sanitizeExcelText(formatManilaTimestamp(value));
}

function populateFeedbackDataSheet(
  wb: ExcelJS.Workbook,
  records: FeedbackRecordRow[],
  options: ExcelWorkbookOptions,
  generatedAt: Date
) {
  const ws = wb.addWorksheet("Feedback Data", { views: [{ state: "frozen", ySplit: 4 }] });

  const columns: { header: string; width: number }[] = [
    { header: "Record ID", width: 38 },
    { header: "Session ID", width: 38 },
    { header: "Submitted At (Asia/Manila)", width: 26 },
    { header: "Created At (Asia/Manila)", width: 26 },
    { header: "Respondent Name", width: 24 },
    { header: "Profession / Role", width: 22 },
    { header: "Computer ID", width: 16 },
    { header: "Overall Experience (1-5)", width: 18 },
    { header: "Overall Sentiment Band", width: 20 },
    { header: "Cleanliness Satisfaction (1-5)", width: 20 },
    { header: "Recommendation (0-10)", width: 18 },
    { header: "NPS Group", width: 18 },
    { header: "Computer Performance (1-5)", width: 20 },
    { header: "Monitor Quality (1-5)", width: 18 },
    { header: "Equipment Ease of Use (1-5)", width: 20 },
    { header: "Equipment Availability (1-5)", width: 20 },
    { header: "Chair Comfort (1-5)", width: 18 },
    { header: "Room Temperature (1-5)", width: 18 },
    { header: "Air Conditioning (1-5)", width: 18 },
    { header: "Lighting (1-5)", width: 16 },
    { header: "Workspace Space (1-5)", width: 18 },
    { header: "Noise Level (1-5)", width: 16 },
    { header: "Equipment Cleanliness (1-5)", width: 20 },
    { header: "Arrangement Suitability (1-5)", width: 20 },
    { header: "Concentration Comfort (1-5)", width: 20 },
    { header: "Has Technical Issues", width: 18 },
    { header: "Technical Issue Description", width: 42 },
    { header: "Liked Most", width: 42 },
    { header: "Features Wanted", width: 42 },
    { header: "Change / Improvement", width: 42 },
    { header: "Most Important Improvement", width: 42 },
  ];

  columns.forEach((col, i) => {
    ws.getColumn(i + 1).width = col.width;
  });

  styleBannerHeader(
    ws,
    columns.length,
    `${options.reportTitle} — Feedback Data (${records.length} record${records.length === 1 ? "" : "s"})`,
    options.scopeDescription,
    generatedAt
  );

  const headerRow = addStyledTableHeader(ws, columns.map((c) => c.header));
  [1, 2, 3, 4, 5, 6, 7, 9, 12, 26, 27, 28, 29, 30, 31].forEach((colIdx) => {
    headerRow.getCell(colIdx).alignment = { vertical: "middle", horizontal: "left", wrapText: true };
  });

  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: columns.length } };

  records.forEach((r, idx) => {
    const row = ws.addRow(new Array(columns.length).fill(""));
    setPlainTextCell(row.getCell(1), r.id);
    setPlainTextCell(row.getCell(2), r.sessionId);
    setPlainTextCell(row.getCell(3), formatTimestampManila(r.submittedAt));
    setPlainTextCell(row.getCell(4), formatTimestampManila(r.createdAt));
    setPlainTextCell(row.getCell(5), r.respondentName || "Anonymous");
    setPlainTextCell(row.getCell(6), r.profession || "");
    setPlainTextCell(row.getCell(7), r.computerId || "");

    setNumericOrNaCell(row.getCell(8), r.overallExperience);
    setPlainTextCell(row.getCell(9), classifyStarSentiment(r.overallExperience));
    setNumericOrNaCell(row.getCell(10), r.cleanlinessSatisfaction);
    setNumericOrNaCell(row.getCell(11), r.recommendationLikelihood);
    setPlainTextCell(row.getCell(12), classifyNpsGroup(r.recommendationLikelihood));

    setNumericOrNaCell(row.getCell(13), r.computerPerformance);
    setNumericOrNaCell(row.getCell(14), r.monitorQuality);
    setNumericOrNaCell(row.getCell(15), r.equipmentEaseOfUse);
    setNumericOrNaCell(row.getCell(16), r.equipmentAvailability);
    setNumericOrNaCell(row.getCell(17), r.chairComfort);
    setNumericOrNaCell(row.getCell(18), r.roomTemperature);
    setNumericOrNaCell(row.getCell(19), r.airConditioning);
    setNumericOrNaCell(row.getCell(20), r.lighting);
    setNumericOrNaCell(row.getCell(21), r.workspaceSpace);
    setNumericOrNaCell(row.getCell(22), r.noiseLevel);
    setNumericOrNaCell(row.getCell(23), r.equipmentCleanliness);
    setNumericOrNaCell(row.getCell(24), r.arrangementSuitability);
    setNumericOrNaCell(row.getCell(25), r.concentrationComfort);

    setPlainTextCell(
      row.getCell(26),
      r.hasTechnicalIssues === null || r.hasTechnicalIssues === undefined ? "N/A" : r.hasTechnicalIssues ? "Yes" : "No"
    );
    setPlainTextCell(row.getCell(27), r.technicalIssueDescription, true);
    setPlainTextCell(row.getCell(28), r.likedMost, true);
    setPlainTextCell(row.getCell(29), r.featuresWanted, true);
    setPlainTextCell(row.getCell(30), r.changeImprovement, true);
    setPlainTextCell(row.getCell(31), r.mostImportantImprovement, true);

    if (idx % 2 === 1) {
      for (let c = 1; c <= columns.length; c++) {
        row.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA_BG } };
      }
    }
    applyThinBorders(row, columns.length);
  });
}

function populateStatisticsSummarySheet(
  wb: ExcelJS.Workbook,
  stats: ComputedStatisticsData,
  options: ExcelWorkbookOptions,
  generatedAt: Date
) {
  const ws = wb.addWorksheet("Statistics Summary", { views: [{ state: "frozen", ySplit: 2 }] });

  const colWidths = [36, 22, 18, 22, 22, 34];
  colWidths.forEach((w, idx) => {
    ws.getColumn(idx + 1).width = w;
  });
  const SPAN = colWidths.length;

  styleBannerHeader(ws, SPAN, `${options.reportTitle} — Statistics Summary`, options.scopeDescription, generatedAt);

  addSectionHeader(ws, "1. EXECUTIVE SUMMARY METRICS", SPAN);
  addStyledTableHeader(ws, ["Metric", "Result", "Sample Size (n)", "Scale / Denominator", "Additional Detail", "Notes"]);

  const formattedNps =
    stats.nps.available && stats.nps.score !== null
      ? `${stats.nps.score > 0 ? "＋" : stats.nps.score < 0 ? "−" : ""}${Math.abs(stats.nps.score).toFixed(1)}`
      : "N/A";

  const summaryRows: [string, string, number, string, string, string][] = [
    ["Total Feedback Submissions", String(stats.total_submissions), stats.total_submissions, "All matching records", `${stats.commentAnalysis.recordsWithAnySubstantiveComment} with written comments`, "Filtered export dataset"],
    ["Average Overall Satisfaction", stats.avg_overall !== null ? `${stats.avg_overall.toFixed(2)} / 5.00` : "N/A", stats.overallSentiment.sampleSize, "1 to 5 Stars", `${stats.overallSentiment.positivePct.toFixed(1)}% Positive (4-5★)`, stats.overallSentiment.missingCount > 0 ? `${stats.overallSentiment.missingCount} missing overall rating(s)` : "Complete coverage"],
    ["Average Recommendation Score", stats.avg_recommendation !== null ? `${stats.avg_recommendation.toFixed(2)} / 10.00` : "N/A", stats.nps.sampleSize, "0 to 10 Likelihood", `NPS: ${formattedNps}`, "Separate from star-rating sentiment"],
    ["Net Promoter Score (NPS)", formattedNps, stats.nps.sampleSize, "−100 to +100", `${stats.nps.promotersPct.toFixed(1)}% Promoters vs ${stats.nps.detractorsPct.toFixed(1)}% Detractors`, "% Promoters (9-10) minus % Detractors (0-6)"],
    ["Technical Issues Reported", stats.tech_sample_size > 0 ? `${stats.tech_issue_count} (${stats.tech_issue_pct_of_answered.toFixed(1)}%)` : "N/A", stats.tech_sample_size, "Yes / No responses", `${stats.no_issue_count} reported No issues`, "Self-reported session issues"],
  ];

  for (const r of summaryRows) {
    const row = ws.addRow(r);
    row.getCell(1).font = { bold: true };
    row.getCell(2).font = { bold: true, color: { argb: BRAND_NAVY } };
    row.getCell(3).alignment = { horizontal: "center" };
    applyThinBorders(row, SPAN);
  }

  ws.addRow([]);

  addSectionHeader(ws, "2. AUTOMATICALLY GENERATED INSIGHTS", SPAN);
  for (const insight of stats.insights) {
    const row = ws.addRow([insight.title, sanitizeExcelText(insight.detail), "", "", "", ""]);
    ws.mergeCells(row.number, 2, row.number, SPAN);
    row.getCell(1).font = { bold: true };
    setPlainTextCell(row.getCell(2), insight.detail, true);
    applyThinBorders(row, SPAN);
  }

  ws.addRow([]);

  addSectionHeader(ws, `3. OVERALL EXPERIENCE SENTIMENT BREAKDOWN (1–5 STARS, n = ${stats.overallSentiment.sampleSize})`, SPAN);
  addStyledTableHeader(ws, ["Sentiment Band", "Star Range", "Responses", "Percentage of Rated", "Denominator (n)", "Definition"]);

  const sentimentTable: [string, string, number, string, number, string][] = [
    ["Positive Feedback", "4–5 Stars", stats.overallSentiment.positiveCount, `${stats.overallSentiment.positivePct.toFixed(1)}%`, stats.overallSentiment.sampleSize, "Satisfied (4★) and Very Satisfied (5★)"],
    ["Neutral Feedback", "3 Stars", stats.overallSentiment.neutralCount, `${stats.overallSentiment.neutralPct.toFixed(1)}%`, stats.overallSentiment.sampleSize, "Neutral overall experience (3★)"],
    ["Negative Feedback", "1–2 Stars", stats.overallSentiment.negativeCount, `${stats.overallSentiment.negativePct.toFixed(1)}%`, stats.overallSentiment.sampleSize, "Very Dissatisfied (1★) and Dissatisfied (2★)"],
  ];

  for (const s of sentimentTable) {
    const row = ws.addRow(s);
    row.getCell(1).font = { bold: true };
    row.getCell(3).alignment = { horizontal: "center" };
    row.getCell(4).alignment = { horizontal: "center" };
    row.getCell(5).alignment = { horizontal: "center" };
    applyThinBorders(row, SPAN);
  }

  ws.addRow([]);

  addSectionHeader(ws, `4. OVERALL STAR RATING DISTRIBUTION (n = ${stats.overallSentiment.sampleSize})`, SPAN);
  addStyledTableHeader(ws, ["Rating", "Responses", "Percentage", "Sample Size (n)", "Sentiment Group", "Visual Share"]);
  for (const d of stats.distribution) {
    const row = ws.addRow([
      `${d.stars} Star${d.stars > 1 ? "s" : ""}`,
      d.count,
      `${d.pct.toFixed(1)}%`,
      stats.overallSentiment.sampleSize,
      classifyStarSentiment(d.stars),
      "█".repeat(Math.round(d.pct / 5)),
    ]);
    row.getCell(2).alignment = { horizontal: "center" };
    row.getCell(3).alignment = { horizontal: "center" };
    row.getCell(4).alignment = { horizontal: "center" };
    applyThinBorders(row, SPAN);
  }

  ws.addRow([]);

  addSectionHeader(ws, `5. NET PROMOTER SCORE (NPS) BREAKDOWN — 0–10 RECOMMENDATION SCALE (n = ${stats.nps.sampleSize})`, SPAN);
  addStyledTableHeader(ws, ["NPS Segment", "Score Range", "Responses", "Percentage", "Sample Size (n)", "NPS Calculation Role"]);

  const npsRows: [string, string, number, string, number, string][] = [
    ["Promoters", "9–10", stats.nps.promotersCount, `${stats.nps.promotersPct.toFixed(1)}%`, stats.nps.sampleSize, "Positive contributor (+%)"],
    ["Passives", "7–8", stats.nps.passivesCount, `${stats.nps.passivesPct.toFixed(1)}%`, stats.nps.sampleSize, "Included in denominator; neutral in score"],
    ["Detractors", "0–6", stats.nps.detractorsCount, `${stats.nps.detractorsPct.toFixed(1)}%`, stats.nps.sampleSize, "Subtracted contributor (-%)"],
  ];

  for (const nr of npsRows) {
    const row = ws.addRow(nr);
    row.getCell(1).font = { bold: true };
    row.getCell(3).alignment = { horizontal: "center" };
    row.getCell(4).alignment = { horizontal: "center" };
    row.getCell(5).alignment = { horizontal: "center" };
    applyThinBorders(row, SPAN);
  }

  const npsTotalRow = ws.addRow(["Net Promoter Score (NPS)", "−100 to +100", stats.nps.sampleSize, formattedNps, stats.nps.sampleSize, "Formula: % Promoters (9-10) − % Detractors (0-6)"]);
  npsTotalRow.font = { bold: true };
  npsTotalRow.getCell(4).alignment = { horizontal: "center" };
  applyThinBorders(npsTotalRow, SPAN);

  ws.addRow([]);

  addSectionHeader(ws, "6. CORE EQUIPMENT & COMFORT COMPARISON (COMPUTERS, MONITORS, AIR CONDITIONING, CHAIRS)", SPAN);
  addStyledTableHeader(ws, ["Focus Area", "Survey Field", "Average (/ 5)", "Sample Size (n)", "Positive 4–5★ (%)", "Low 1–2★ (%)"]);

  for (const item of stats.keyEquipmentComparison) {
    const row = ws.addRow([
      item.label,
      item.fieldLabel,
      item.average !== null ? Number(item.average.toFixed(2)) : "N/A",
      item.sampleSize,
      `${item.positiveCount} (${item.positivePct.toFixed(1)}%)`,
      `${item.lowCount} (${item.lowPct.toFixed(1)}%)`,
    ]);
    row.getCell(1).font = { bold: true };
    if (typeof item.average === "number") row.getCell(3).numFmt = "0.00";
    row.getCell(3).alignment = { horizontal: "center" };
    row.getCell(4).alignment = { horizontal: "center" };
    row.getCell(5).alignment = { horizontal: "center" };
    row.getCell(6).alignment = { horizontal: "center" };
    applyThinBorders(row, SPAN);
  }

  ws.addRow([]);

  addSectionHeader(ws, "7. COMPLETE RATING CATEGORY RANKING (LOWEST TO HIGHEST — BOTTOM 3 HIGHLIGHTED)", SPAN);
  addStyledTableHeader(ws, ["Category", "Survey Group", "Rank (Lowest First)", "Average (/ 5)", "Sample Size (n)", "Priority Status"]);

  for (const cat of stats.categoryRankings) {
    const row = ws.addRow([
      cat.label,
      cat.group,
      cat.rank !== null ? `#${cat.rank}` : "Unrated",
      cat.average !== null ? Number(cat.average.toFixed(2)) : "N/A",
      cat.sampleSize,
      cat.isBottomThree
        ? `Priority Focus — Lowest #${cat.rank}`
        : cat.rank !== null
        ? `Ranked #${cat.rank} of ${stats.categoryRankings.filter((c) => c.rank !== null).length}`
        : "No valid ratings",
    ]);
    row.getCell(3).alignment = { horizontal: "center" };
    if (typeof cat.average === "number") row.getCell(4).numFmt = "0.00";
    row.getCell(4).alignment = { horizontal: "center" };
    row.getCell(5).alignment = { horizontal: "center" };

    if (cat.isBottomThree) {
      for (let c = 1; c <= SPAN; c++) {
        row.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALERT_BG } };
        row.getCell(c).font = { bold: true, color: { argb: "FF78350F" } };
      }
      applyThinBorders(row, SPAN, ALERT_BORDER);
    } else {
      applyThinBorders(row, SPAN);
    }
  }

  if (stats.trends.length > 0) {
    ws.addRow([]);
    addSectionHeader(ws, "8. SUBMISSION TRENDS BY DATE (UP TO LAST 30 ACTIVE DAYS)", SPAN);
    addStyledTableHeader(ws, ["Date (Asia/Manila)", "Submissions", "", "", "", ""]);
    for (const t of stats.trends) {
      const row = ws.addRow([t.period, t.count, "", "", "", ""]);
      row.getCell(2).alignment = { horizontal: "center" };
      applyThinBorders(row, SPAN);
    }
  }

  if (stats.computerSummary.length > 0) {
    ws.addRow([]);
    addSectionHeader(ws, "9. BREAKDOWN BY WORKSTATION / COMPUTER ID", SPAN);
    addStyledTableHeader(ws, ["Computer ID", "Submissions", "Avg Overall (/ 5)", "Avg PC Performance (/ 5)", "Avg Monitor (/ 5)", "Technical Issues Reported"]);
    for (const comp of stats.computerSummary) {
      const row = ws.addRow([
        sanitizeExcelText(comp.computerId),
        comp.submissions,
        comp.avgOverall !== null ? Number(comp.avgOverall.toFixed(2)) : "N/A",
        comp.avgComputerPerformance !== null ? Number(comp.avgComputerPerformance.toFixed(2)) : "N/A",
        comp.avgMonitorQuality !== null ? Number(comp.avgMonitorQuality.toFixed(2)) : "N/A",
        comp.techIssueCount,
      ]);
      setPlainTextCell(row.getCell(1), comp.computerId);
      for (let c = 2; c <= 6; c++) row.getCell(c).alignment = { horizontal: "center" };
      applyThinBorders(row, SPAN);
    }
  }
}

function addCommentBucketSection(ws: ExcelJS.Worksheet, sectionTitle: string, bucket: CommentBucketAnalysis, span: number) {
  addSectionHeader(ws, `${sectionTitle} (Distinct Responses with Comments: n = ${bucket.distinctResponseCount})`, span);
  addStyledTableHeader(ws, ["Recurring Theme", "Distinct Responses", "% of Commented (n)", "Detected Multi-Word Phrases", "Representative Plain-Text Examples"]);

  if (bucket.themes.length === 0) {
    const emptyRow = ws.addRow([
      "No matching recurring themes detected in this category.",
      0,
      "0.0%",
      bucket.recurringPhrases.map((p) => `${p.phrase} (${p.distinctResponses})`).join(", ") || "—",
      bucket.distinctResponseCount > 0
        ? "Comments present did not match predefined theme keywords."
        : "No substantive comments submitted for this section.",
    ]);
    emptyRow.getCell(2).alignment = { horizontal: "center" };
    emptyRow.getCell(3).alignment = { horizontal: "center" };
    applyThinBorders(emptyRow, span);
  } else {
    for (const t of bucket.themes) {
      const formattedExamples = t.examples
        .map((ex, i) => `${i + 1}. [${ex.sourceField}${ex.computerId ? ` — ${ex.computerId}` : ""}] "${ex.text}"`)
        .join("\n");

      const row = ws.addRow([t.theme, t.distinctResponses, `${t.percentageOfCommented.toFixed(1)}%`, t.recurringPhrases.join(", ") || "—", ""]);
      row.getCell(1).font = { bold: true };
      row.getCell(2).alignment = { horizontal: "center" };
      row.getCell(3).alignment = { horizontal: "center" };
      setPlainTextCell(row.getCell(4), t.recurringPhrases.join(", ") || "—", true);
      setPlainTextCell(row.getCell(5), formattedExamples, true);
      applyThinBorders(row, span);
    }
  }

  if (bucket.recurringPhrases.length > 0) {
    const phraseSummary = bucket.recurringPhrases
      .map((p) => `"${p.phrase}" (${p.distinctResponses} response${p.distinctResponses === 1 ? "" : "s"})`)
      .join("; ");
    const phraseRow = ws.addRow(["Top Multi-Word Phrases (n-grams)", bucket.recurringPhrases.length, `n = ${bucket.distinctResponseCount}`, "", ""]);
    ws.mergeCells(phraseRow.number, 4, phraseRow.number, span);
    phraseRow.getCell(1).font = { italic: true, bold: true };
    phraseRow.getCell(2).alignment = { horizontal: "center" };
    phraseRow.getCell(3).alignment = { horizontal: "center" };
    setPlainTextCell(phraseRow.getCell(4), phraseSummary, true);
    applyThinBorders(phraseRow, span);
  }

  ws.addRow([]);
}

function populateCommentAnalysisSheet(
  wb: ExcelJS.Workbook,
  stats: ComputedStatisticsData,
  options: ExcelWorkbookOptions,
  generatedAt: Date
) {
  const ws = wb.addWorksheet("Comment Analysis", { views: [{ state: "frozen", ySplit: 2 }] });

  const colWidths = [34, 20, 20, 34, 62];
  colWidths.forEach((w, idx) => {
    ws.getColumn(idx + 1).width = w;
  });
  const SPAN = colWidths.length;
  const ca = stats.commentAnalysis;

  styleBannerHeader(ws, SPAN, `${options.reportTitle} — Written Comment Analysis`, options.scopeDescription, generatedAt);

  addSectionHeader(ws, `1. KEY WRITTEN-FEEDBACK FINDINGS (${ca.recordsWithAnySubstantiveComment} of ${ca.totalRecordsAnalyzed} records with substantive comments)`, SPAN);
  const findingsHeaderRow = addStyledTableHeader(ws, ["Category", "Distinct Mentions", "Denominator (n)", "Finding Summary", ""]);
  ws.mergeCells(findingsHeaderRow.number, 4, findingsHeaderRow.number, SPAN);

  for (const f of ca.findings) {
    const label =
      f.category === "positive"
        ? "Positive Feedback"
        : f.category === "suggestions"
        ? "Improvement Suggestions"
        : f.category === "technicalIssues"
        ? "Reported Technical Issues"
        : "Overview";
    const row = ws.addRow([label, f.supportingCount, f.denominator, "", ""]);
    ws.mergeCells(row.number, 4, row.number, SPAN);
    row.getCell(1).font = { bold: true };
    row.getCell(2).alignment = { horizontal: "center" };
    row.getCell(3).alignment = { horizontal: "center" };
    setPlainTextCell(row.getCell(4), f.statement, true);
    applyThinBorders(row, SPAN);
  }

  ws.addRow([]);

  addCommentBucketSection(ws, "2. POSITIVE FEEDBACK & WHAT USERS APPRECIATE (liked_most)", ca.positive, SPAN);
  addCommentBucketSection(ws, "3. IMPROVEMENT SUGGESTIONS & REQUESTED FEATURES (features_wanted, change_improvement, most_important_improvement)", ca.suggestions, SPAN);
  addCommentBucketSection(ws, "4. REPORTED TECHNICAL PROBLEMS (technical_issue_description)", ca.technicalIssues, SPAN);

  addSectionHeader(ws, "5. ANALYSIS METHOD & INTERPRETIVE LIMITATIONS", SPAN);
  const methodRow = ws.addRow(["Methodology", "", "", "", ""]);
  ws.mergeCells(methodRow.number, 2, methodRow.number, SPAN);
  methodRow.getCell(1).font = { bold: true };
  setPlainTextCell(methodRow.getCell(2), ca.methodology, true);
  applyThinBorders(methodRow, SPAN);

  ca.limitations.forEach((lim, idx) => {
    const lRow = ws.addRow([`Limitation ${idx + 1}`, "", "", "", ""]);
    ws.mergeCells(lRow.number, 2, lRow.number, SPAN);
    lRow.getCell(1).font = { bold: true, color: { argb: "FF78350F" } };
    setPlainTextCell(lRow.getCell(2), lim, true);
    applyThinBorders(lRow, SPAN);
  });
}

export async function buildFeedbackExcelWorkbook(
  records: FeedbackRecordRow[],
  options: ExcelWorkbookOptions
): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "COGNĪTA Training Room Management System";
  wb.created = options.generatedAt ?? new Date();
  wb.modified = wb.created;

  const stats = computeFeedbackStatistics(records);

  populateFeedbackDataSheet(wb, records, options, wb.created);
  populateStatisticsSummarySheet(wb, stats, options, wb.created);
  populateCommentAnalysisSheet(wb, stats, options, wb.created);

  const buffer = await wb.xlsx.writeBuffer();
  return new Uint8Array(buffer as ArrayBuffer);
}

export async function buildStatisticsExcelWorkbook(
  records: FeedbackRecordRow[],
  options: ExcelWorkbookOptions,
  allKnownComputers?: string[]
): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "COGNĪTA Training Room Management System";
  wb.created = options.generatedAt ?? new Date();
  wb.modified = wb.created;

  const stats = computeFeedbackStatistics(records, allKnownComputers);

  populateStatisticsSummarySheet(wb, stats, options, wb.created);
  populateCommentAnalysisSheet(wb, stats, options, wb.created);
  populateFeedbackDataSheet(wb, records, options, wb.created);

  const buffer = await wb.xlsx.writeBuffer();
  return new Uint8Array(buffer as ArrayBuffer);
}
