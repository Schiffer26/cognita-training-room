import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedbackRecords } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
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
  PageBreak,
} from "docx";

function starText(val: number | null): string {
  if (!val) return "N/A";
  const labels = ["", "Very Dissatisfied", "Dissatisfied", "Neutral", "Satisfied", "Very Satisfied"];
  return "★".repeat(val) + "☆".repeat(5 - val) + ` (${labels[val] || val})`;
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

type RecordType = typeof feedbackRecords.$inferSelect;

function buildInfoTable(record: RecordType): Table {
  const rows = [
    ["Name", record.respondentName || "Anonymous"],
    ["Date", formatDate(record.submittedAt)],
    ["Profession", record.profession || "N/A"],
    ["Overall Rating", starText(record.overallExperience)],
    ["Cleanliness", starText(record.cleanlinessSatisfaction)],
    ["Recommendation", `${record.recommendationLikelihood ?? "N/A"}/10`],
    ["Computer ID", record.computerId || "N/A"],
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      ([label, value]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 22 })] })],
              borders: cellBorders(),
            }),
            new TableCell({
              width: { size: 70, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: value, size: 22 })] })],
              borders: cellBorders(),
            }),
          ],
        })
    ),
  });
}

function cellBorders() {
  const b = { style: BorderStyle.SINGLE, size: 1, color: "999999" };
  return { top: b, bottom: b, left: b, right: b };
}

function ratingRow(question: string, value: number | null): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 70, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ children: [new TextRun({ text: question, size: 20 })] })],
        borders: cellBorders(),
      }),
      new TableCell({
        width: { size: 30, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ children: [new TextRun({ text: starText(value), size: 20 })] })],
        borders: cellBorders(),
      }),
    ],
  });
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 100 },
    children: [new TextRun({ text, bold: true, size: 26, color: "4a1e1e" })],
  });
}

function textParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ text: text || "No response provided.", size: 22 })],
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

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Header
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 50 },
            children: [
              new TextRun({ text: "COGNĪTA", bold: true, size: 40, font: "Georgia" }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 50 },
            children: [
              new TextRun({ text: "By DICT Iligan", size: 22, color: "666666" }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({ text: "Training Room Feedback Report", size: 28, bold: true, color: "4a1e1e" }),
            ],
          }),

          // Info table
          buildInfoTable(record),

          // Computers and Equipment
          sectionHeading("COMPUTERS AND EQUIPMENT"),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              ratingRow("1. Computer performance", record.computerPerformance),
              ratingRow("2. Monitor quality and condition", record.monitorQuality),
              ratingRow("3. Ease of use of equipment", record.equipmentEaseOfUse),
              ratingRow("4. Equipment availability", record.equipmentAvailability),
            ],
          }),

          // Training Room Environment
          sectionHeading("TRAINING ROOM ENVIRONMENT"),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              ratingRow("1. Noise level", record.noiseLevel),
              ratingRow("2. Cleanliness of PCs, desks, equipment", record.equipmentCleanliness),
              ratingRow("3. Arrangement of PCs and chairs", record.arrangementSuitability),
              ratingRow("4. Comfort and concentration", record.concentrationComfort),
            ],
          }),

          // Comfort and Room Conditions
          sectionHeading("COMFORT AND ROOM CONDITIONS"),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              ratingRow("1. Chair comfort", record.chairComfort),
              ratingRow("2. Room temperature", record.roomTemperature),
              ratingRow("3. Air-conditioning and ventilation", record.airConditioning),
              ratingRow("4. Lighting", record.lighting),
              ratingRow("5. Workspace space", record.workspaceSpace),
            ],
          }),

          // Page break
          new Paragraph({ children: [new PageBreak()] }),

          // Technical Issues
          sectionHeading("Technical Difficulties encountered:"),
          textParagraph(
            record.hasTechnicalIssues
              ? record.technicalIssueDescription || "Issues reported but no description provided."
              : "No technical difficulties reported."
          ),

          // Feedback
          sectionHeading("What did you like most about the training room?"),
          textParagraph(record.likedMost || ""),

          sectionHeading("What equipment, facilities, or features would you like to see added?"),
          textParagraph(record.featuresWanted || ""),

          sectionHeading("If you could change/improve one thing about the training room, what would it be?"),
          textParagraph(record.changeImprovement || ""),

          sectionHeading("What is the single most important thing we could do to improve your experience?"),
          textParagraph(record.mostImportantImprovement || ""),

          // Footer
          new Paragraph({
            spacing: { before: 400 },
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `Generated by COGNĪTA on ${new Date().toLocaleDateString("en-PH", { timeZone: MANILA_TIMEZONE })}`,
                size: 18,
                color: "999999",
                italics: true,
              }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const uint8 = new Uint8Array(buffer);

  const fileName = `COGNITA-Feedback-${(record.respondentName || "Anonymous").replace(/\s+/g, "_")}-${formatDate(record.submittedAt).replace(/\s+/g, "_")}.docx`;

  return new NextResponse(uint8, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
