import { NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { requireMerchant } from "@/lib/merchant-helpers";

export async function GET() {
  const auth = await requireMerchant();

  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const merchantId = auth.merchant.merchant_id;

    const [couponStats, redemptionStats, settlementStats, programs] =
      await Promise.all([
        query(
          `SELECT
             COUNT(*)::INT AS total_coupons,
             COUNT(*) FILTER (WHERE status = 'active'
               AND expires_on >= CURRENT_DATE)::INT AS active_coupons
           FROM coupons
           WHERE merchant_id = $1`,
          [merchantId]
        ),
        query(
          `SELECT
             COALESCE(SUM(claimed_count), 0)::BIGINT AS total_claims,
             COALESCE(SUM(redeemed_count), 0)::BIGINT AS total_redemptions
           FROM merchant_coupon_redemption_summary
           WHERE merchant_id = $1`,
          [merchantId]
        ),
        query(
          `SELECT direction, currency, status,
                  SUM(total_amount)::NUMERIC(14,2) AS total_amount,
                  SUM(settlement_count)::BIGINT AS settlement_count
           FROM merchant_settlement_summary
           WHERE merchant_id = $1
           GROUP BY direction, currency, status
           ORDER BY currency, direction, status`,
          [merchantId]
        ),
        query(
          `SELECT program_id, program_name, points_name, status
           FROM programs
           WHERE merchant_id = $1
           ORDER BY program_name`,
          [merchantId]
        ),
      ]);

    return NextResponse.json({
      merchant: auth.merchant,
      coupons: couponStats.rows[0],
      redemptions: redemptionStats.rows[0],
      settlements: settlementStats.rows,
      programs: programs.rows,
    });
  } catch (error) {
    console.error("Merchant dashboard failed:", error.message);
    return NextResponse.json(
      { error: "Unable to load merchant dashboard" },
      { status: 500 }
    );
  }
}
