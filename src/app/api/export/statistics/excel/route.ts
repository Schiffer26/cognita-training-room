import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedbackRecords } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { desc, isNotNull } from "drizzle-orm";
import {
  buildFeedbackWhereClause,
  describeFeedbackFilters,
  formatManilaDateKey,
} from "@/lib/feedback-query";
import { buildStatisticsExcelWorkbook } from "@/lib/excel-export";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const dateFrom = url.searchParams.get("dateFrom") || undefined;
  const dateTo = url.searchParams.get("dateTo") || undefined;
  const computerId = url.searchParams.get("computerId") || undefined;

  try {
    const whereClause = buildFeedbackWhereClause({
      dateFrom,
      dateTo,
      computerId,
    });

    const [records, computerRows] = await Promise.all([
      db
        .select()
        .from(feedbackRecords)
        .where(whereClause)
        .orderBy(desc(feedbackRecords.submittedAt)),
      db
        .selectDistinct({ computerId: feedbackRecords.computerId })
        .from(feedbackRecords)
        .where(isNotNull(feedbackRecords.computerId)),
    ]);

    const computers = computerRows
      .map((r) => r.computerId?.trim())
      .filter((c): c is string => Boolean(c))
      .sort((a, b) => a.localeCompare(b));

    const scopeDescription = describeFeedbackFilters("statistics", {
      dateFrom,
      dateTo,
      computerId,
    });

    const now = new Date();
    const workbookBytes = await buildStatisticsExcelWorkbook(
      records,
      {
        reportTitle: "COGNĪTA Training Room Statistics Report",
        scopeDescription,
        generatedAt: now,
      },
      computers
    );

    const dateStamp = formatManilaDateKey(now);

    return new NextResponse(Buffer.from(workbookBytes), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="COGNITA_Statistics_Report_${dateStamp}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Excel statistics export error:", error);
    return NextResponse.json(
      { error: "Failed to generate Excel statistics report." },
      { status: 500 }
    );
  }
}
