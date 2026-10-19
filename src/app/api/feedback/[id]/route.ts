import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedbackRecords, auditLog } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

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

  return NextResponse.json({ record });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [record] = await db
    .select({ id: feedbackRecords.id })
    .from(feedbackRecords)
    .where(eq(feedbackRecords.id, id))
    .limit(1);

  if (!record) {
    return NextResponse.json({ error: "Record not found." }, { status: 404 });
  }

  await db.delete(feedbackRecords).where(eq(feedbackRecords.id, id));

  // Audit log
  await db.insert(auditLog).values({
    adminId: session.adminId,
    action: "DELETE_FEEDBACK",
    targetType: "feedback_record",
    targetId: id,
    details: `Deleted feedback record ${id}`,
  });

  return NextResponse.json({
    success: true,
    message: "Record deleted successfully.",
  });
}
