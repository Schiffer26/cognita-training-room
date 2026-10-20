import { feedbackRecords } from "@/db/schema";
import { and, asc, desc, eq, gte, ilike, lte, sql, SQL } from "drizzle-orm";

export type FeedbackRecordRow = typeof feedbackRecords.$inferSelect;

export const MANILA_TIMEZONE = "Asia/Manila";
export const MANILA_UTC_OFFSET = "+08:00";

const MANILA_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: MANILA_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const MANILA_DATE_TIME_PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: MANILA_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export interface FeedbackFilterParams {
  search?: string;
  filterField?: string;
  filterValue?: string;
  dateFrom?: string;
  dateTo?: string;
  computerId?: string;
  sortField?: string;
  sortDir?: string;
}

/**
 * Formats a Date (or date string) as YYYY-MM-DD in Asia/Manila (UTC+08:00),
 * independent of the host OS/serverless timezone.
 */
export function formatManilaDateKey(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return MANILA_DATE_FORMATTER.format(d);
}

/**
 * Formats a Date (or date string) as "YYYY-MM-DD HH:mm:ss PHT" in Asia/Manila (UTC+08:00).
 */
export function formatManilaTimestamp(
  value: Date | string | null | undefined
): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  const parts = MANILA_DATE_TIME_PARTS.formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")} PHT`;
}

/**
 * Parses a calendar date start boundary in Asia/Manila (00:00:00.000+08:00).
 * Drizzle maps timestamp columns without timezone via `.toISOString()` (UTC),
 * so returning the exact Manila midnight Date guarantees consistent UTC+08:00 filtering.
 */
export function parseDateStart(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;
  const isoCandidate = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? `${trimmed}T00:00:00.000${MANILA_UTC_OFFSET}`
    : trimmed;
  const parsed = new Date(isoCandidate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Parses a calendar date end boundary in Asia/Manila (23:59:59.999+08:00).
 */
export function parseDateEnd(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;
  const isoCandidate = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? `${trimmed}T23:59:59.999${MANILA_UTC_OFFSET}`
    : trimmed;
  const parsed = new Date(isoCandidate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function buildFeedbackWhereClause(
  params: FeedbackFilterParams
): SQL | undefined {
  const conditions: SQL[] = [];

  const search = params.search?.trim() || "";
  if (search) {
    conditions.push(
      sql`(${feedbackRecords.respondentName} ILIKE ${"%" + search + "%"} OR ${feedbackRecords.profession} ILIKE ${"%" + search + "%"} OR ${feedbackRecords.computerId} ILIKE ${"%" + search + "%"})`
    );
  }

  const filterField = params.filterField?.trim() || "";
  const filterValue = params.filterValue?.trim() || "";
  if (filterField && filterValue) {
    if (filterField === "computerId") {
      conditions.push(ilike(feedbackRecords.computerId, `%${filterValue}%`));
    } else if (filterField === "profession") {
      conditions.push(ilike(feedbackRecords.profession, `%${filterValue}%`));
    } else if (filterField === "hasTechnicalIssues") {
      conditions.push(
        eq(feedbackRecords.hasTechnicalIssues, filterValue === "true")
      );
    } else if (filterField === "overallExperience") {
      const rating = Number.parseInt(filterValue, 10);
      if (!Number.isNaN(rating)) {
        conditions.push(eq(feedbackRecords.overallExperience, rating));
      }
    }
  }

  if (params.computerId?.trim()) {
    conditions.push(eq(feedbackRecords.computerId, params.computerId.trim()));
  }

  const start = parseDateStart(params.dateFrom);
  if (start) {
    conditions.push(gte(feedbackRecords.submittedAt, start));
  }

  const end = parseDateEnd(params.dateTo);
  if (end) {
    conditions.push(lte(feedbackRecords.submittedAt, end));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

export function buildFeedbackOrderBy(sortField?: string, sortDir?: string) {
  type SortableColumn =
    | typeof feedbackRecords.submittedAt
    | typeof feedbackRecords.respondentName
    | typeof feedbackRecords.overallExperience
    | typeof feedbackRecords.profession;

  const sortColumns: Record<string, SortableColumn> = {
    submittedAt: feedbackRecords.submittedAt,
    respondentName: feedbackRecords.respondentName,
    overallExperience: feedbackRecords.overallExperience,
    profession: feedbackRecords.profession,
  };

  const col = sortColumns[sortField || "submittedAt"] || feedbackRecords.submittedAt;
  return sortDir === "asc" ? asc(col) : desc(col);
}

export function describeFeedbackFilters(
  mode: "selected" | "filtered" | "all" | "statistics",
  params: FeedbackFilterParams,
  selectedCount?: number
): string {
  if (mode === "selected") {
    return `Selected Entries (${selectedCount ?? 0} chosen manually)`;
  }
  if (mode === "all") {
    return "All Database Records (unfiltered)";
  }

  const parts: string[] = [];
  if (params.search?.trim()) {
    parts.push(`Search: "${params.search.trim()}"`);
  }
  if (params.filterField && params.filterValue) {
    parts.push(`${params.filterField}: ${params.filterValue}`);
  }
  if (params.computerId?.trim()) {
    parts.push(`Computer: ${params.computerId.trim()}`);
  }
  if (params.dateFrom || params.dateTo) {
    parts.push(
      `Date (Asia/Manila): ${params.dateFrom || "Start"} to ${params.dateTo || "End"}`
    );
  }

  if (parts.length === 0) {
    return mode === "statistics"
      ? "All Time / All Computers"
      : "Filtered Entries (No active filter constraints — all records matched)";
  }
  return parts.join(" | ");
}
