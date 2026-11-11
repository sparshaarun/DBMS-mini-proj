import { NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { requireAdmin, writeAdminAudit } from "@/lib/admin-helpers";

export async function GET() {
  const auth = await requireAdmin();

  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const result = await query(`
      SELECT
        s.settlement_id,
        s.debtor_merchant_id,
        debtor.business_name AS debtor_name,
        s.creditor_merchant_id,
        creditor.business_name AS creditor_name,
        s.created_by,
        u.full_name AS created_by_name,
        s.period_start,
        s.period_end,
        s.amount,
        s.currency,
        s.status,
        s.settled_at
      FROM settlements s
      JOIN merchants debtor
        ON debtor.merchant_id = s.debtor_merchant_id
      JOIN merchants creditor
        ON creditor.merchant_id = s.creditor_merchant_id
      JOIN users u ON u.user_id = s.created_by
      ORDER BY
        CASE WHEN s.status = 'pending' THEN 0 ELSE 1 END,
        s.period_end DESC,
        s.settlement_id DESC
    `);

    return NextResponse.json({ settlements: result.rows });
  } catch (error) {
    console.error("Admin settlements list failed:", error.message);
    return NextResponse.json(
      { error: "Unable to load settlements" },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  const auth = await requireAdmin();

  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const settlementId = Number(body.settlementId);
    const status = body.status;

    if (
      !Number.isSafeInteger(settlementId) ||
      settlementId <= 0 ||
      !["paid", "cancelled"].includes(status)
    ) {
      return NextResponse.json(
        { error: "A valid settlement ID and status are required" },
        { status: 400 }
      );
    }

    const result = await query(
      `UPDATE settlements
       SET status = $1,
           settled_at = CASE WHEN $1 = 'paid' THEN NOW() ELSE NULL END
       WHERE settlement_id = $2
         AND status = 'pending'
         AND period_end < CURRENT_DATE
       RETURNING settlement_id, status, settled_at`,
      [status, settlementId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Settlement not found, already finalized, or its month is still open" },
        { status: 409 }
      );
    }

    await writeAdminAudit("settlement_status_updated", auth.user, {
      settlementId,
      status,
    });

    return NextResponse.json({ settlement: result.rows[0] });
  } catch (error) {
    console.error("Admin settlement update failed:", error.message);
    if (error.code === "P0001") {
      return NextResponse.json(
        { error: "This monthly settlement cannot be finalized before its period ends" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Unable to update settlement" },
      { status: 500 }
    );
  }
}
