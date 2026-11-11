import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/postgres";
import { createToken, setAuthCookie } from "@/lib/auth";

export async function POST(request) {
  try {
    const body = await request.json();

    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const result = await query(
      `SELECT
         u.user_id,
         u.full_name,
         u.email,
         u.password_hash,
         u.role,
         m.status AS merchant_status
       FROM users u
       LEFT JOIN merchants m ON m.user_id = u.user_id
       WHERE LOWER(u.email) = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (user.role === "merchant" && user.merchant_status !== "active") {
      return NextResponse.json(
        { error: "Merchant account is inactive" },
        { status: 403 }
      );
    }

    const token = createToken(user);
    await setAuthCookie(token);

    // Audit only successful login, and do not fail authentication if MongoDB is offline.
    try {
      const { getMongoDb } = await import("@/lib/mongodb");
      const db = await getMongoDb();
      await db.collection("audit_logs").insertOne({
        eventType: "user_login",
        timestamp: new Date(),
        actor: { userId: Number(user.user_id), role: user.role },
        details: { status: "success" },
      });
    } catch (auditError) {
      console.error("Login succeeded, but MongoDB audit logging failed:", auditError.message);
    }

    const { password_hash, merchant_status, ...safeUser } = user;

    return NextResponse.json({
      message: "Login successful",
      user: safeUser,
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return NextResponse.json(
      { error: "Unable to log in" },
      { status: 500 }
    );
  }
}
