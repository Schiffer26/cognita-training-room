import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { count } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    // Only allow setup if no admins exist
    const [result] = await db.select({ total: count() }).from(admins);
    if (result.total > 0) {
      return NextResponse.json(
        { error: "An administrator account already exists. Setup is disabled." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { username, password, displayName } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    const [admin] = await db
      .insert(admins)
      .values({
        username,
        passwordHash,
        displayName: displayName || username,
      })
      .returning({ id: admins.id, username: admins.username });

    return NextResponse.json({
      success: true,
      message: "Administrator account created successfully.",
      admin: { id: admin.id, username: admin.username },
    });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { error: "Failed to create administrator account." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const [result] = await db.select({ total: count() }).from(admins);
    return NextResponse.json({ needsSetup: result.total === 0 });
  } catch {
    return NextResponse.json({ needsSetup: true });
  }
}
