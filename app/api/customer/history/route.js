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
      `SELECT * FROM (
         SELECT t.transaction_id AS activity_id,
                'exchange'::TEXT AS activity_type,
                t.created_at AS occurred_at,
                'Points exchanged'::TEXT AS summary,
                t.points_debited::TEXT || ' ' || source.points_name ||
                  ' → ' || t.points_credited::TEXT || ' ' || destination.points_name AS details
         FROM transactions t
         JOIN programs source ON source.program_id = t.from_program_id
         JOIN programs destination ON destination.program_id = t.to_program_id
         WHERE t.user_id = $1

         UNION ALL

         SELECT uc.user_coupon_id AS activity_id,
                'coupon'::TEXT AS activity_type,
                COALESCE(uc.redeemed_at, uc.claimed_at) AS occurred_at,
                CASE uc.status
                  WHEN 'redeemed' THEN 'Coupon redeemed'
                  WHEN 'expired' THEN 'Coupon expired'
                  ELSE 'Coupon claimed'
                END AS summary,
                c.title AS details
         FROM user_coupons uc
         JOIN coupons c ON c.coupon_id = uc.coupon_id
         WHERE uc.user_id = $1
       ) AS activity
       ORDER BY occurred_at DESC
       LIMIT 50`,
      [auth.user.user_id]
    );

    return NextResponse.json({ activities: result.rows });
  } catch (error) {
    console.error("Customer history lookup failed:", error.message);
    return NextResponse.json(
      { error: "Unable to load activity history right now" },
      { status: 500 }
    );
  }
}
