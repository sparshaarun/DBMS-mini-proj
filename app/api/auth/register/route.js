import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/postgres";
import { createToken, setAuthCookie } from "@/lib/auth";

export async function POST(request) {
  try {
    const body = await request.json();

    const fullName = body.fullName?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    if (!fullName || !email || !password) {
      return NextResponse.json(
        { error: "Full name, email and password are required" },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    if (fullName.length > 100 || email.length > 255) {
      return NextResponse.json(
        { error: "Input exceeds the allowed length" },
        { status: 400 }
      );
    }

    const existingUser = await query(
      "SELECT user_id FROM users WHERE LOWER(email) = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, 'customer')
       RETURNING user_id, full_name, email, role, created_at`,
      [fullName, email, passwordHash]
    );

    const user = result.rows[0];
    const token = createToken(user);

    await setAuthCookie(token);

    return NextResponse.json(
      {
        message: "Registration successful",
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    console.error("Registration error:", error.message);

    return NextResponse.json(
      { error: "Unable to register account" },
      { status: 500 }
    );
  }
}
