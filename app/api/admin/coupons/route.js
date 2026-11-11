import { NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { requireAdmin } from "@/lib/admin-helpers";

export async function GET() {
  const auth = await requireAdmin();

  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const result = await query(`
      SELECT
        c.coupon_id,
        c.title,
        c.description,
        c.category,
        c.status,
        c.max_claims,
        c.claimed_count,
        c.expires_on,
        c.created_at,
        m.merchant_id,
        m.business_name,
        p.program_name,
        COUNT(uc.user_coupon_id)::int AS total_claim_records,
        COUNT(uc.user_coupon_id) FILTER (WHERE uc.status = 'redeemed')::int
          AS redeemed_count
      FROM coupons c
      JOIN merchants m ON m.merchant_id = c.merchant_id
      JOIN programs p ON p.program_id = c.program_id
      LEFT JOIN user_coupons uc ON uc.coupon_id = c.coupon_id
      GROUP BY c.coupon_id, m.merchant_id, p.program_id
      ORDER BY c.created_at DESC
    `);

    return NextResponse.json({ coupons: result.rows });
  } catch (error) {
    console.error("Admin coupon list failed:", error.message);
    return NextResponse.json(
      { error: "Unable to load coupons" },
      { status: 500 }
    );
  }
}
