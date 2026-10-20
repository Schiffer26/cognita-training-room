import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedbackRecords } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { jsPDF } from "jspdf";

/**
 * Draw a single five-pointed star as a vector shape.
 *
 * jsPDF's built-in fonts (Helvetica, Courier, Times) only cover basic Latin
 * characters.  Unicode stars (★ ☆) fall outside that range and are rendered
 * as "&".  Drawing the star as a polygon avoids this limitation entirely.
 */
function drawStar(
  doc: jsPDF,
  cx: number,
  cy: number,
  size: number,
  filled: boolean
) {
  const outerR = size / 2;
  const innerR = outerR * 0.38;

  // 10 vertices: alternating outer / inner points starting from the top
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    // Start at –90° (top) and step 36° each time
    const angle = -Math.PI / 2 + i * (Math.PI / 5);
    const r = i % 2 === 0 ? outerR : innerR;
    pts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }

  // jsPDF.lines() expects delta pairs relative to the first point
  const deltas: [number, number][] = [];
  for (let i = 1; i < pts.length; i++) {
    deltas.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]);
  }

  if (filled) {
    doc.setFillColor(230, 160, 0); // gold / amber
  } else {
    doc.setFillColor(215, 215, 215); // light gray for empty
  }
  doc.setDrawColor(170, 150, 100);
  doc.setLineWidth(0.15);

  doc.lines(deltas, pts[0][0], pts[0][1], [1, 1], "FD", true);
}

/**
 * Draw a row of five stars and return the x-coordinate just past the last
 * star so that a text label can be placed after it.
 */
function drawStarRating(
  doc: jsPDF,
  x: number,
  y: number,
  rating: number,
  maxStars = 5
): number {
  const starSize = 3; // diameter in mm
  const gap = 1; // space between stars

  for (let i = 0; i < maxStars; i++) {
    const cx = x + i * (starSize + gap) + starSize / 2;
    drawStar(doc, cx, y, starSize, i < rating);
  }

  return x + maxStars * (starSize + gap) + 1; // 1 mm extra breathing room
}

/** Plain-text label that accompanies a star rating (no star characters). */
function ratingLabel(val: number | null): string {
  if (!val) return "N/A";
  const labels = [
    "",
    "Very Dissatisfied",
    "Dissatisfied",
    "Neutral",
    "Satisfied",
    "Very Satisfied",
  ];
  return `(${labels[val] || val})`;
}

import { MANILA_TIMEZONE } from "@/lib/feedback-query";

function formatDate(d: Date | null): string {
  if (!d) return "N/A";
  return new Date(d).toLocaleDateString("en-PH", {
    timeZone: MANILA_TIMEZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const [record] = await db
    .select()
    .from(feedbackRecords)
    .where(eq(feedbackRecords.id, id))
    .limit(1);

  if (!record) {
    return NextResponse.json({ error: "Record not found." }, { status: 404 });
  }

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

  // ── Header ──────────────────────────────────────────────────────────
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(24);
  pdf.setTextColor(74, 30, 30);
  pdf.text("COGNITA", pageWidth / 2, y, { align: "center" });
  y += 8;
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(100, 100, 100);
  pdf.text("By DICT Iligan", pageWidth / 2, y, { align: "center" });
  y += 6;
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(74, 30, 30);
  pdf.text("Training Room Feedback Report", pageWidth / 2, y, {
    align: "center",
  });
  y += 12;

  // Divider
  pdf.setDrawColor(212, 168, 67);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ── Info rows (plain text) ──────────────────────────────────────────
  function infoRow(label: string, value: string) {
    checkPage(8);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(50, 50, 50);
    pdf.text(label + ":", margin, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(value, margin + 55, y);
    y += 6;
  }

  /** Info row where the value is a star rating drawn as vector shapes. */
  function infoRowStars(label: string, rating: number | null) {
    checkPage(8);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(50, 50, 50);
    pdf.text(label + ":", margin, y);

    if (!rating) {
      pdf.setFont("helvetica", "normal");
      pdf.text("N/A", margin + 55, y);
    } else {
      // Draw star shapes, then the text label after them
      const afterStars = drawStarRating(pdf, margin + 55, y - 1.2, rating);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text(ratingLabel(rating), afterStars, y);
    }
    y += 6;
  }

  infoRow("Name", record.respondentName || "Anonymous");
  infoRow("Date", formatDate(record.submittedAt));
  infoRow("Profession", record.profession || "N/A");
  infoRowStars("Overall Rating", record.overallExperience);
  infoRowStars("Cleanliness", record.cleanlinessSatisfaction);
  infoRow(
    "Recommendation",
    `${record.recommendationLikelihood ?? "N/A"}/10`
  );
  infoRow("Computer ID", record.computerId || "N/A");
  y += 4;

  // ── Section heading helper ──────────────────────────────────────────
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

  // ── Rating table row with vector stars ──────────────────────────────
  function ratingTableRow(question: string, value: number | null) {
    checkPage(8);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(50, 50, 50);
    pdf.text(question, margin + 2, y);

    if (!value) {
      pdf.text("N/A", margin + contentWidth * 0.7, y);
    } else {
      const starsX = margin + contentWidth * 0.65;
      const afterStars = drawStarRating(pdf, starsX, y - 1.2, value);
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text(ratingLabel(value), afterStars, y);
    }
    y += 7;
  }

  // ── Computers and Equipment ─────────────────────────────────────────
  sectionHead("COMPUTERS AND EQUIPMENT");
  ratingTableRow("1. Computer performance", record.computerPerformance);
  ratingTableRow(
    "2. Monitor quality and condition",
    record.monitorQuality
  );
  ratingTableRow("3. Ease of use of equipment", record.equipmentEaseOfUse);
  ratingTableRow("4. Equipment availability", record.equipmentAvailability);

  // ── Training Room Environment ───────────────────────────────────────
  sectionHead("TRAINING ROOM ENVIRONMENT");
  ratingTableRow("1. Noise level", record.noiseLevel);
  ratingTableRow(
    "2. Cleanliness of PCs, desks, equipment",
    record.equipmentCleanliness
  );
  ratingTableRow(
    "3. Arrangement of PCs and chairs",
    record.arrangementSuitability
  );
  ratingTableRow(
    "4. Comfort and concentration",
    record.concentrationComfort
  );

  // ── Comfort and Room Conditions ─────────────────────────────────────
  sectionHead("COMFORT AND ROOM CONDITIONS");
  ratingTableRow("1. Chair comfort", record.chairComfort);
  ratingTableRow("2. Room temperature", record.roomTemperature);
  ratingTableRow(
    "3. Air-conditioning and ventilation",
    record.airConditioning
  );
  ratingTableRow("4. Lighting", record.lighting);
  ratingTableRow("5. Workspace space", record.workspaceSpace);

  // ── Technical Issues (page 2) ───────────────────────────────────────
  pdf.addPage();
  y = 20;
  sectionHead("Technical Difficulties Encountered");
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(50, 50, 50);
  const techText = record.hasTechnicalIssues
    ? record.technicalIssueDescription ||
      "Issues reported but no description provided."
    : "No technical difficulties reported.";
  const techLines = pdf.splitTextToSize(techText, contentWidth - 4);
  for (const line of techLines) {
    checkPage(6);
    pdf.text(line, margin + 2, y);
    y += 5;
  }
  y += 4;

  // ── Text feedback sections ──────────────────────────────────────────
  function textSection(title: string, text: string | null) {
    sectionHead(title);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(50, 50, 50);
    const content = text || "No response provided.";
    const lines = pdf.splitTextToSize(content, contentWidth - 4);
    for (const line of lines) {
      checkPage(6);
      pdf.text(line, margin + 2, y);
      y += 5;
    }
    y += 4;
  }

  textSection(
    "What did you like most about the training room?",
    record.likedMost
  );
  textSection(
    "What equipment, facilities, or features would you like to see added?",
    record.featuresWanted
  );
  textSection(
    "If you could change/improve one thing, what would it be?",
    record.changeImprovement
  );
  textSection(
    "Most important improvement for your experience?",
    record.mostImportantImprovement
  );

  // ── Footer ──────────────────────────────────────────────────────────
  checkPage(20);
  y += 10;
  pdf.setDrawColor(212, 168, 67);
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 6;
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  pdf.text(
    `Generated by COGNITA on ${new Date().toLocaleDateString("en-PH", { timeZone: MANILA_TIMEZONE })}`,
    pageWidth / 2,
    y,
    { align: "center" }
  );

  // ── Output ──────────────────────────────────────────────────────────
  const pdfOutput = pdf.output("arraybuffer");
  const uint8 = new Uint8Array(pdfOutput);

  const fileName = `COGNITA-Feedback-${(record.respondentName || "Anonymous").replace(/\s+/g, "_")}-${formatDate(record.submittedAt).replace(/\s+/g, "_")}.pdf`;

  return new NextResponse(uint8, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
