import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedbackRecords } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import {
  buildFeedbackOrderBy,
  buildFeedbackWhereClause,
} from "@/lib/feedback-query";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate session ID
    if (!body.sessionId) {
      return NextResponse.json(
        { error: "Session ID is required." },
        { status: 400 }
      );
    }

    // Validate required ratings
    const requiredFields = [
      "overallExperience",
      "cleanlinessSatisfaction",
      "recommendationLikelihood",
      "computerPerformance",
      "monitorQuality",
      "equipmentEaseOfUse",
      "equipmentAvailability",
      "chairComfort",
      "roomTemperature",
      "airConditioning",
      "lighting",
      "workspaceSpace",
      "noiseLevel",
      "equipmentCleanliness",
      "arrangementSuitability",
      "concentrationComfort",
    ];

    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null) {
        return NextResponse.json(
          { error: `Rating for ${field} is required.` },
          { status: 400 }
        );
      }
    }

    if (body.hasTechnicalIssues === undefined) {
      return NextResponse.json(
        { error: "Technical issues field is required." },
        { status: 400 }
      );
    }

    // Check for duplicate session
    const existing = await db
      .select({ id: feedbackRecords.id })
      .from(feedbackRecords)
      .where(eq(feedbackRecords.sessionId, body.sessionId))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        {
          error: "Feedback for this session has already been submitted.",
          alreadySubmitted: true,
        },
        { status: 409 }
      );
    }

    const now = new Date();

    const [record] = await db
      .insert(feedbackRecords)
      .values({
        sessionId: body.sessionId,
        respondentName: body.respondentName || null,
        profession: body.profession || null,
        computerId: body.computerId || null,
        overallExperience: body.overallExperience,
        cleanlinessSatisfaction: body.cleanlinessSatisfaction,
        recommendationLikelihood: body.recommendationLikelihood,
        computerPerformance: body.computerPerformance,
        monitorQuality: body.monitorQuality,
        equipmentEaseOfUse: body.equipmentEaseOfUse,
        equipmentAvailability: body.equipmentAvailability,
        chairComfort: body.chairComfort,
        roomTemperature: body.roomTemperature,
        airConditioning: body.airConditioning,
        lighting: body.lighting,
        workspaceSpace: body.workspaceSpace,
        noiseLevel: body.noiseLevel,
        equipmentCleanliness: body.equipmentCleanliness,
        arrangementSuitability: body.arrangementSuitability,
        concentrationComfort: body.concentrationComfort,
        hasTechnicalIssues: body.hasTechnicalIssues,
        technicalIssueDescription: body.hasTechnicalIssues
          ? body.technicalIssueDescription || null
          : null,
        likedMost: body.likedMost || null,
        featuresWanted: body.featuresWanted || null,
        changeImprovement: body.changeImprovement || null,
        mostImportantImprovement: body.mostImportantImprovement || null,
        submittedAt: now,
        createdAt: now,
      })
      .returning({ id: feedbackRecords.id, sessionId: feedbackRecords.sessionId });

    return NextResponse.json({
      success: true,
      message: "Feedback submitted successfully.",
      record: { id: record.id, sessionId: record.sessionId },
    });
  } catch (error: unknown) {
    const pgError = error as { code?: string };
    if (pgError.code === "23505") {
      return NextResponse.json(
        {
          error: "Feedback for this session has already been submitted.",
          alreadySubmitted: true,
        },
        { status: 409 }
      );
    }
    console.error("Feedback submission error:", error);
    return NextResponse.json(
      { error: "Failed to save feedback. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Admin-only: list feedback records
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "10"), 50);
  const search = url.searchParams.get("search") || "";
  const sortField = url.searchParams.get("sortField") || "submittedAt";
  const sortDir = url.searchParams.get("sortDir") || "desc";
  const filterField = url.searchParams.get("filterField") || "";
  const filterValue = url.searchParams.get("filterValue") || "";
  const dateFrom = url.searchParams.get("dateFrom") || "";
  const dateTo = url.searchParams.get("dateTo") || "";

  const whereClause = buildFeedbackWhereClause({
    search,
    filterField,
    filterValue,
    dateFrom,
    dateTo,
  });
  const orderBy = buildFeedbackOrderBy(sortField, sortDir);

  const [records, totalResult] = await Promise.all([
    db
      .select()
      .from(feedbackRecords)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset((page - 1) * limit),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(feedbackRecords)
      .where(whereClause),
  ]);

  return NextResponse.json({
    records,
    total: totalResult[0].total,
    page,
    limit,
    totalPages: Math.ceil(totalResult[0].total / limit),
  });
}
