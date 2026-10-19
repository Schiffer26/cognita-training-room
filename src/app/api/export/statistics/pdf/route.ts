import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { getSession } from "@/lib/auth";
import { sql } from "drizzle-orm";
import { jsPDF } from "jspdf";

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
    if (dateFrom) baseWhere = sql`${baseWhere} AND submitted_at >= ${new Date(dateFrom)}`;
    if (dateTo) baseWhere = sql`${baseWhere} AND submitted_at <= ${new Date(dateTo + "T23:59:59")}`;
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

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = 20;

    function checkPage(needed: number) {
      if (y + needed > 270) {
        pdf.addPage();
        y = 20;
      }
    }

    // Header
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(24);
    pdf.setTextColor(74, 30, 30);
    pdf.text("COGNITA", pageWidth / 2, y, { align: "center" });
    y += 8;

    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(74, 30, 30);
    pdf.text("Training Room Statistics Report", pageWidth / 2, y, { align: "center" });
    y += 8;

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Generated on: ${new Date().toLocaleString("en-PH")}`, pageWidth / 2, y, { align: "center" });
    y += 5;
    pdf.text(`Filters applied: ${filterText}`, pageWidth / 2, y, { align: "center" });
    y += 12;

    pdf.setDrawColor(212, 168, 67);
    pdf.setLineWidth(0.5);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 12;

    function sectionHead(title: string) {
      checkPage(16);
      pdf.setDrawColor(212, 168, 67);
      pdf.setLineWidth(0.3);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 6;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.setTextColor(74, 30, 30);
      pdf.text(title, margin, y);
      y += 8;
    }

    function rowText(label: string, value: string, isBoldValue = true) {
      checkPage(8);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(50, 50, 50);
      pdf.text(label, margin + 2, y);

      pdf.setFont("helvetica", isBoldValue ? "bold" : "normal");
      pdf.text(value, margin + contentWidth * 0.65, y);
      y += 7;
    }

    sectionHead("OVERALL SUMMARY");
    rowText("Total Submissions", String(total));
    rowText("Avg Overall Satisfaction", stats.avg_overall ? `${stats.avg_overall.toFixed(1)} / 5` : "N/A");
    rowText("Avg Recommendation Likelihood", stats.avg_recommendation ? `${stats.avg_recommendation.toFixed(1)} / 10` : "N/A");
    rowText("Technical Issues Reported", `${stats.tech_issue_count || 0} (${techPercent}%)`);
    y += 4;

    sectionHead("AVERAGE RATINGS BY CATEGORY (OUT OF 5)");
    rowText("Computer Performance", stats.avg_computer_performance ? stats.avg_computer_performance.toFixed(1) : "N/A", false);
    rowText("Monitor Quality", stats.avg_monitor_quality ? stats.avg_monitor_quality.toFixed(1) : "N/A", false);
    rowText("Equipment Ease of Use", stats.avg_equipment_ease ? stats.avg_equipment_ease.toFixed(1) : "N/A", false);
    rowText("Equipment Availability", stats.avg_equipment_availability ? stats.avg_equipment_availability.toFixed(1) : "N/A", false);
    rowText("Cleanliness Satisfaction", stats.avg_cleanliness ? stats.avg_cleanliness.toFixed(1) : "N/A", false);
    rowText("Chair Comfort", stats.avg_chair_comfort ? stats.avg_chair_comfort.toFixed(1) : "N/A", false);
    rowText("Room Temperature", stats.avg_room_temperature ? stats.avg_room_temperature.toFixed(1) : "N/A", false);
    rowText("Air Conditioning", stats.avg_air_conditioning ? stats.avg_air_conditioning.toFixed(1) : "N/A", false);
    rowText("Lighting", stats.avg_lighting ? stats.avg_lighting.toFixed(1) : "N/A", false);
    rowText("Workspace Space", stats.avg_workspace ? stats.avg_workspace.toFixed(1) : "N/A", false);
    rowText("Noise Level", stats.avg_noise ? stats.avg_noise.toFixed(1) : "N/A", false);
    rowText("Equipment Cleanliness", stats.avg_equipment_cleanliness ? stats.avg_equipment_cleanliness.toFixed(1) : "N/A", false);
    rowText("Arrangement Suitability", stats.avg_arrangement ? stats.avg_arrangement.toFixed(1) : "N/A", false);
    rowText("Concentration Comfort", stats.avg_concentration ? stats.avg_concentration.toFixed(1) : "N/A", false);
    y += 4;

    checkPage(40);
    sectionHead("OVERALL RATING DISTRIBUTION");
    [5, 4, 3, 2, 1].forEach((stars) => {
      const match = distribution.find((d: any) => d.stars === stars);
      const count = match ? (match.count as number) : 0;
      const pct = total > 0 ? (count / total) * 100 : 0;
      rowText(`${stars} Star${stars > 1 ? 's' : ''}`, `${count} (${pct.toFixed(1)}%)`, false);
    });

    const pdfOutput = pdf.output("arraybuffer");
    const uint8 = new Uint8Array(pdfOutput);

    return new NextResponse(uint8, {
      headers: {
        "Content-Type": "application/pdf",
      },
    });
  } catch (error) {
    console.error("PDF export error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
