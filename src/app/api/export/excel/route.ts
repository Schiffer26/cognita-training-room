import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedbackRecords } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { inArray } from "drizzle-orm";
import {
  buildFeedbackOrderBy,
  buildFeedbackWhereClause,
  describeFeedbackFilters,
  formatManilaDateKey,
  type FeedbackFilterParams,
} from "@/lib/feedback-query";
import { buildFeedbackExcelWorkbook } from "@/lib/excel-export";

type ExportMode = "selected" | "filtered" | "all";

interface ExportRequestPayload extends FeedbackFilterParams {
  ids?: unknown;
}

function isValidExportMode(value: unknown): value is ExportMode {
  return value === "selected" || value === "filtered" || value === "all";
}

async function handleExcelExport(
  mode: ExportMode,
  payload: ExportRequestPayload
) {
  const orderBy = buildFeedbackOrderBy(payload.sortField, payload.sortDir);

  let records;
  let scopeDescription: string;

  if (mode === "selected") {
    if (!Array.isArray(payload.ids)) {
      return NextResponse.json(
        { error: "Selected export mode requires an 'ids' array." },
        { status: 400 }
      );
    }

    const cleanIds = Array.from(
      new Set(
        payload.ids
          .filter(
            (id): id is string => typeof id === "string" && id.trim().length > 0
          )
          .map((id) => id.trim())
      )
    );

    if (cleanIds.length === 0) {
      return NextResponse.json(
        { error: "Please select at least one feedback record to export." },
        { status: 400 }
      );
    }

    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (cleanIds.some((id) => !UUID_RE.test(id))) {
      return NextResponse.json(
        { error: "One or more selected record IDs are not valid UUIDs." },
        { status: 400 }
      );
    }

    records = await db
      .select()
      .from(feedbackRecords)
      .where(inArray(feedbackRecords.id, cleanIds))
      .orderBy(orderBy);

    scopeDescription = describeFeedbackFilters(
      "selected",
      payload,
      records.length
    );
  } else if (mode === "filtered") {
    const whereClause = buildFeedbackWhereClause(payload);
    records = await db
      .select()
      .from(feedbackRecords)
      .where(whereClause)
      .orderBy(orderBy);

    scopeDescription = describeFeedbackFilters("filtered", payload);
  } else {
    const exhaustiveAllCheck: "all" = mode;
    void exhaustiveAllCheck;
    records = await db.select().from(feedbackRecords).orderBy(orderBy);
    scopeDescription = describeFeedbackFilters("all", {});
  }

  const now = new Date();
  const workbookBytes = await buildFeedbackExcelWorkbook(records, {
    reportTitle: "COGNĪTA Feedback Report",
    scopeDescription,
    generatedAt: now,
  });

  const dateStamp = formatManilaDateKey(now);
  const modeLabel =
    mode === "selected"
      ? "Selected"
      : mode === "filtered"
      ? "Filtered"
      : "All";
  const fileName = `COGNITA-Feedback-${modeLabel}-${dateStamp}.xlsx`;

  return new NextResponse(Buffer.from(workbookBytes), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Malformed JSON request body." },
      { status: 400 }
    );
  }

  if (
    !parsedBody ||
    typeof parsedBody !== "object" ||
    Array.isArray(parsedBody)
  ) {
    return NextResponse.json(
      { error: "Request body must be a JSON object." },
      { status: 400 }
    );
  }

  const body = parsedBody as Record<string, unknown>;
  if (!isValidExportMode(body.mode)) {
    return NextResponse.json(
      {
        error:
          "Missing or invalid export mode. Explicitly specify 'selected', 'filtered', or 'all'.",
      },
      { status: 400 }
    );
  }

  try {
    return await handleExcelExport(body.mode, {
      ids: body.ids,
      search: typeof body.search === "string" ? body.search : undefined,
      filterField:
        typeof body.filterField === "string" ? body.filterField : undefined,
      filterValue:
        typeof body.filterValue === "string" ? body.filterValue : undefined,
      dateFrom: typeof body.dateFrom === "string" ? body.dateFrom : undefined,
      dateTo: typeof body.dateTo === "string" ? body.dateTo : undefined,
      sortField:
        typeof body.sortField === "string" ? body.sortField : undefined,
      sortDir: typeof body.sortDir === "string" ? body.sortDir : undefined,
    });
  } catch (error) {
    console.error("Excel feedback export error:", error);
    return NextResponse.json(
      { error: "Failed to generate Excel export." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const rawMode = url.searchParams.get("mode");
  if (!isValidExportMode(rawMode)) {
    return NextResponse.json(
      {
        error:
          "Missing or invalid export mode. Explicitly specify 'selected', 'filtered', or 'all'.",
      },
      { status: 400 }
    );
  }

  const idsParam = url.searchParams.get("ids");
  const ids = idsParam
    ? idsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  try {
    return await handleExcelExport(rawMode, {
      ids,
      search: url.searchParams.get("search") || undefined,
      filterField: url.searchParams.get("filterField") || undefined,
      filterValue: url.searchParams.get("filterValue") || undefined,
      dateFrom: url.searchParams.get("dateFrom") || undefined,
      dateTo: url.searchParams.get("dateTo") || undefined,
      sortField: url.searchParams.get("sortField") || undefined,
      sortDir: url.searchParams.get("sortDir") || undefined,
    });
  } catch (error) {
    console.error("Excel feedback export error:", error);
    return NextResponse.json(
      { error: "Failed to generate Excel export." },
      { status: 500 }
    );
  }
}
