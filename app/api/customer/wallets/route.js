import { NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { requireRole } from "@/lib/auth-helpers";

export async function GET() {
  const auth = await requireRole(["customer"]);

  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const result = await query(
      `SELECT wallet_id, program_id, program_name, points_name,
              merchant_id, business_name, balance, updated_at
       FROM customer_wallet_summary
       WHERE user_id = $1
       ORDER BY business_name, program_name`,
      [auth.user.user_id]
    );

    return NextResponse.json({ wallets: result.rows });
  } catch (error) {
    console.error("Customer wallet lookup failed:", error.message);
    return NextResponse.json(
      { error: "Unable to load wallets right now" },
      { status: 500 }
    );
  }
}
