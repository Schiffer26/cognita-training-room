
import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { count } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid setup request." },
        { status: 400 }
      );
    }

    const { username, password, displayName, setupKey } =
      body as Record<string, unknown>;

    // Require a secret key for production setup.
    if (process.env.NODE_ENV === "production") {
      const expectedKey = process.env.COGNITA_SETUP_KEY;

      if (!expectedKey) {
        return NextResponse.json(
          { error: "Initial setup is not configured on the server." },
          { status: 503 }
        );
      }

      const providedKey =
        typeof setupKey === "string" ? setupKey : "";

      const providedBytes = Buffer.from(providedKey, "utf8");
      const expectedBytes = Buffer.from(expectedKey, "utf8");

      if (
        providedBytes.length !== expectedBytes.length ||
        !timingSafeEqual(providedBytes, expectedBytes)
      ) {
        return NextResponse.json(
          { error: "Invalid setup key." },
          { status: 401 }
        );
      }
    }

    if (
      typeof username !== "string" ||
      !username.trim() ||
      typeof password !== "string" ||
      !password
    ) {
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

    // Only allow setup if no administrators exist.
    const [result] = await db
      .select({ total: count() })
      .from(admins);

    if (result.total > 0) {
      return NextResponse.json(
        {
          error:
            "An administrator account already exists. Setup is disabled.",
        },
        { status: 403 }
      );
    }

    const passwordHash = await hashPassword(password);

    const [admin] = await db
      .insert(admins)
      .values({
        username: username.trim(),
        passwordHash,
        displayName:
          typeof displayName === "string" && displayName.trim()
            ? displayName.trim()
            : username.trim(),
      })
      .returning({
        id: admins.id,
        username: admins.username,
      });

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
    const [result] = await db
      .select({ total: count() })
      .from(admins);

    return NextResponse.json({ needsSetup: result.total === 0 });
  } catch {
    return NextResponse.json({ needsSetup: true });
  }
}
