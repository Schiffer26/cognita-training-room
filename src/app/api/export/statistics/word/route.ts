import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { getSession } from "@/lib/auth";
import { sql } from "drizzle-orm";
import {
  MANILA_TIMEZONE,
  parseDateEnd,
  parseDateStart,
} from "@/lib/feedback-query";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
} from "docx";

function cellBorders() {
  const b = { style: BorderStyle.SINGLE, size: 1, color: "999999" };
  return { top: b, bottom: b, left: b, right: b };
}

function buildTable(rowsData: [string, string][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rowsData.map(
      ([label, value]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 70, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: label, size: 22 })] })],
              borders: cellBorders(),
            }),
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: value, size: 22, bold: true })] })],
              borders: cellBorders(),
            }),
          ],
        })
    ),
  });
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 100 },
    children: [new TextRun({ text, bold: true, size: 26, color: "4a1e1e" })],
  });
}

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
    const startDate = parseDateStart(dateFrom);
    const endDate = parseDateEnd(dateTo);
    if (startDate) {
      baseWhere = sql`${baseWhere} AND submitted_at >= ${startDate.toISOString()}`;
    }
    if (endDate) {
      baseWhere = sql`${baseWhere} AND submitted_at <= ${endDate.toISOString()}`;
    }
    if (computerId) baseWhere = sql`${baseWhere} AND computer_id = ${computerId}`;

    const distWhere = sql`${baseWhere} AND overall_experience IS NOT NULL`;

    const statsRes = await db.execute(sql`
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
        COUNT(*) FILTER (WHERE has_technical_issues = true)::int AS tech_issue_count
      FROM feedback_records
      ${baseWhere}
    `);

    const distributionRes = await db.execute(sql`
      SELECT overall_experience AS stars, COUNT(*)::int AS count
      FROM feedback_records
      ${distWhere}
      GROUP BY overall_experience
      ORDER BY overall_experience DESC
    `);

    const stats = statsRes.rows[0] as any;
    const distribution = distributionRes.rows;
    const total = stats.total_submissions || 0;
    const techPercent = total > 0 ? Math.round((stats.tech_issue_count / total) * 100) : 0;

    let filterText = "All Time / All Computers";
    const filterParts = [];
    if (dateFrom || dateTo) filterParts.push(`Date: ${dateFrom || "Start"} to ${dateTo || "End"}`);
    if (computerId) filterParts.push(`Computer: ${computerId}`);
    if (filterParts.length > 0) filterText = filterParts.join(" | ");

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 50 },
              children: [new TextRun({ text: "COGNĪTA", bold: true, size: 40, font: "Georgia" })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
              children: [new TextRun({ text: "Training Room Statistics Report", size: 28, bold: true, color: "4a1e1e" })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
              children: [
                new TextRun({
                  text: `Generated on: ${new Date().toLocaleString("en-PH", { timeZone: MANILA_TIMEZONE })} PHT\n`,
                  size: 20,
                  color: "666666",
                }),
                new TextRun({ text: `Filters applied: ${filterText}`, size: 20, color: "666666" })
              ],
            }),

            sectionHeading("OVERALL SUMMARY"),
            buildTable([
              ["Total Submissions", String(total)],
              ["Avg Overall Satisfaction (out of 5)", stats.avg_overall ? stats.avg_overall.toFixed(1) : "N/A"],
              ["Avg Recommendation Likelihood (out of 10)", stats.avg_recommendation ? stats.avg_recommendation.toFixed(1) : "N/A"],
              ["Technical Issues Reported", `${stats.tech_issue_count || 0} (${techPercent}%)`],
            ]),

            sectionHeading("AVERAGE RATINGS BY CATEGORY (OUT OF 5)"),
            buildTable([
              ["Computer Performance", stats.avg_computer_performance ? stats.avg_computer_performance.toFixed(1) : "N/A"],
              ["Monitor Quality", stats.avg_monitor_quality ? stats.avg_monitor_quality.toFixed(1) : "N/A"],
              ["Equipment Ease of Use", stats.avg_equipment_ease ? stats.avg_equipment_ease.toFixed(1) : "N/A"],
              ["Equipment Availability", stats.avg_equipment_availability ? stats.avg_equipment_availability.toFixed(1) : "N/A"],
              ["Cleanliness Satisfaction", stats.avg_cleanliness ? stats.avg_cleanliness.toFixed(1) : "N/A"],
              ["Chair Comfort", stats.avg_chair_comfort ? stats.avg_chair_comfort.toFixed(1) : "N/A"],
              ["Room Temperature", stats.avg_room_temperature ? stats.avg_room_temperature.toFixed(1) : "N/A"],
              ["Air Conditioning", stats.avg_air_conditioning ? stats.avg_air_conditioning.toFixed(1) : "N/A"],
              ["Lighting", stats.avg_lighting ? stats.avg_lighting.toFixed(1) : "N/A"],
              ["Workspace Space", stats.avg_workspace ? stats.avg_workspace.toFixed(1) : "N/A"],
              ["Noise Level", stats.avg_noise ? stats.avg_noise.toFixed(1) : "N/A"],
              ["Equipment Cleanliness", stats.avg_equipment_cleanliness ? stats.avg_equipment_cleanliness.toFixed(1) : "N/A"],
              ["Arrangement Suitability", stats.avg_arrangement ? stats.avg_arrangement.toFixed(1) : "N/A"],
              ["Concentration Comfort", stats.avg_concentration ? stats.avg_concentration.toFixed(1) : "N/A"],
            ]),

            sectionHeading("OVERALL RATING DISTRIBUTION"),
            buildTable(
              [5, 4, 3, 2, 1].map((stars) => {
                const match = distribution.find((d: any) => d.stars === stars);
                const count = match ? match.count : 0;
                const pct = total > 0 ? ((count as number) / total) * 100 : 0;
                return [`${stars} Star${stars > 1 ? 's' : ''}`, `${count} (${pct.toFixed(1)}%)`];
              })
            ),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const uint8 = new Uint8Array(buffer);

    return new NextResponse(uint8, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
    });
  } catch (error) {
    console.error("Word export error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
