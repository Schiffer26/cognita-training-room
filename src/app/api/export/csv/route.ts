import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedbackRecords } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { inArray } from "drizzle-orm";

function escCsv(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const ids: string[] = body.ids || [];

  let records;
  if (ids.length > 0) {
    records = await db
      .select()
      .from(feedbackRecords)
      .where(inArray(feedbackRecords.id, ids));
  } else {
    records = await db.select().from(feedbackRecords);
  }

  const headers = [
    "Name", "Profession", "Computer ID", "Submitted At",
    "Overall Experience", "Cleanliness Satisfaction", "Recommendation (0-10)",
    "Computer Performance", "Monitor Quality", "Equipment Ease of Use", "Equipment Availability",
    "Chair Comfort", "Room Temperature", "Air Conditioning", "Lighting", "Workspace Space",
    "Noise Level", "Equipment Cleanliness", "Arrangement Suitability", "Concentration Comfort",
    "Has Technical Issues", "Technical Issue Description",
    "Liked Most", "Features Wanted", "Change/Improvement", "Most Important Improvement",
  ];

  const rows = records.map((r) => [
    escCsv(r.respondentName),
    escCsv(r.profession),
    escCsv(r.computerId),
    escCsv(r.submittedAt ? new Date(r.submittedAt).toISOString() : ""),
    escCsv(r.overallExperience),
    escCsv(r.cleanlinessSatisfaction),
    escCsv(r.recommendationLikelihood),
    escCsv(r.computerPerformance),
    escCsv(r.monitorQuality),
    escCsv(r.equipmentEaseOfUse),
    escCsv(r.equipmentAvailability),
    escCsv(r.chairComfort),
    escCsv(r.roomTemperature),
    escCsv(r.airConditioning),
    escCsv(r.lighting),
    escCsv(r.workspaceSpace),
    escCsv(r.noiseLevel),
    escCsv(r.equipmentCleanliness),
    escCsv(r.arrangementSuitability),
    escCsv(r.concentrationComfort),
    escCsv(r.hasTechnicalIssues),
    escCsv(r.technicalIssueDescription),
    escCsv(r.likedMost),
    escCsv(r.featuresWanted),
    escCsv(r.changeImprovement),
    escCsv(r.mostImportantImprovement),
  ].join(","));

  const csv = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="COGNITA-Feedback-Export-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
