import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { getSession } from "@/lib/auth";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  const computerId = url.searchParams.get("computerId");

  try {
    let baseWhere = sql`WHERE 1=1`;
    if (dateFrom) {
      baseWhere = sql`${baseWhere} AND submitted_at >= ${new Date(dateFrom)}`;
    }
    if (dateTo) {
      baseWhere = sql`${baseWhere} AND submitted_at <= ${new Date(dateTo + "T23:59:59")}`;
    }
    if (computerId) {
      baseWhere = sql`${baseWhere} AND computer_id = ${computerId}`;
    }

    const distWhere = sql`${baseWhere} AND overall_experience IS NOT NULL`;

    // 1. Calculate totals and averages in a single read-only pass
    const statsQuery = sql`
      SELECT
        COUNT(*)::int AS total_submissions,
        ROUND(AVG(overall_experience), 2)::float AS avg_overall,
        ROUND(AVG(cleanliness_satisfaction), 2)::float AS avg_cleanliness,
        ROUND(AVG(recommendation_likelihood), 2)::float AS avg_recommendation,
        ROUND(AVG(computer_performance), 2)::float AS avg_computer_performance,
        ROUND(AVG(monitor_quality), 2)::float AS avg_monitor_quality,
        ROUND(AVG(equipment_ease_of_use), 2)::float AS avg_equipment_ease,
        ROUND(AVG(equipment_availability), 2)::float AS avg_equipment_availability,
        ROUND(AVG(chair_comfort), 2)::float AS avg_chair_comfort,
        ROUND(AVG(room_temperature), 2)::float AS avg_room_temperature,
        ROUND(AVG(air_conditioning), 2)::float AS avg_air_conditioning,
        ROUND(AVG(lighting), 2)::float AS avg_lighting,
        ROUND(AVG(workspace_space), 2)::float AS avg_workspace,
        ROUND(AVG(noise_level), 2)::float AS avg_noise,
        ROUND(AVG(equipment_cleanliness), 2)::float AS avg_equipment_cleanliness,
        ROUND(AVG(arrangement_suitability), 2)::float AS avg_arrangement,
        ROUND(AVG(concentration_comfort), 2)::float AS avg_concentration,
        COUNT(*) FILTER (WHERE has_technical_issues = true)::int AS tech_issue_count,
        COUNT(*) FILTER (WHERE has_technical_issues = false)::int AS no_issue_count
      FROM feedback_records
      ${baseWhere}
    `;
    const statsRes = await db.execute(statsQuery);

    // 2. Calculate rating distribution
    const distributionQuery = sql`
      SELECT overall_experience AS stars, COUNT(*)::int AS count
      FROM feedback_records
      ${distWhere}
      GROUP BY overall_experience
      ORDER BY overall_experience DESC
    `;
    const distributionRes = await db.execute(distributionQuery);

    // 3. Simple submission trend by day
    const trendsQuery = sql`
      SELECT TO_CHAR(DATE_TRUNC('day', submitted_at), 'YYYY-MM-DD') AS period, COUNT(*)::int AS count
      FROM feedback_records
      ${baseWhere}
      GROUP BY period
      ORDER BY period ASC
      LIMIT 30
    `;
    const trendsRes = await db.execute(trendsQuery);

    // 4. Fetch unique computers for filter dropdown
    const computersQuery = sql`
      SELECT DISTINCT computer_id
      FROM feedback_records
      WHERE computer_id IS NOT NULL
      ORDER BY computer_id ASC
    `;
    const computersRes = await db.execute(computersQuery);

    return NextResponse.json({
      success: true,
      data: {
        ...statsRes.rows[0],
        distribution: distributionRes.rows,
        trends: trendsRes.rows,
        computers: computersRes.rows.map((r: any) => r.computer_id)
      }
    });
  } catch (error) {
    console.error("Statistics error:", error);
    return NextResponse.json({ error: "Failed to generate statistics" }, { status: 500 });
  }
}
