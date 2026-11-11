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

    const [summary, settlements] = await Promise.all([
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
        `SELECT s.settlement_id, s.period_start, s.period_end,
                s.amount, s.currency, s.status, s.settled_at,
                debtor.business_name AS debtor_business,
                creditor.business_name AS creditor_business,
                CASE
                  WHEN s.debtor_merchant_id = $1 THEN 'owes'
                  ELSE 'owed'
                END AS direction
         FROM settlements s
         JOIN merchants debtor
           ON debtor.merchant_id = s.debtor_merchant_id
         JOIN merchants creditor
           ON creditor.merchant_id = s.creditor_merchant_id
         WHERE s.debtor_merchant_id = $1
            OR s.creditor_merchant_id = $1
         ORDER BY s.period_end DESC, s.settlement_id DESC`,
        [merchantId]
      ),
    ]);

    return NextResponse.json({
      summary: summary.rows,
      settlements: settlements.rows,
    });
  } catch (error) {
    console.error("Merchant settlements query failed:", error.message);
    return NextResponse.json(
      { error: "Unable to load settlements" },
      { status: 500 }
    );
  }
}
