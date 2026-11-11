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
        m.merchant_id,
        m.business_name,
        m.status,
        m.created_at,
        u.user_id,
        u.full_name,
        u.email,
        COUNT(DISTINCT p.program_id)::int AS program_count,
        COUNT(DISTINCT c.coupon_id)::int AS coupon_count
      FROM merchants m
      JOIN users u ON u.user_id = m.user_id
      LEFT JOIN programs p ON p.merchant_id = m.merchant_id
      LEFT JOIN coupons c ON c.merchant_id = m.merchant_id
      GROUP BY m.merchant_id, u.user_id
      ORDER BY m.created_at DESC
    `);

    return NextResponse.json({ merchants: result.rows });
  } catch (error) {
    console.error("Admin merchant list failed:", error.message);
    return NextResponse.json(
      { error: "Unable to load merchants" },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  const auth = await requireAdmin();

  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const merchantId = Number(body?.merchantId);
  const status = body?.status;

  if (!Number.isSafeInteger(merchantId) || merchantId <= 0) {
    return NextResponse.json({ error: "Invalid merchant ID" }, { status: 400 });
  }

  if (!["active", "inactive"].includes(status)) {
    return NextResponse.json({ error: "Status must be active or inactive" }, { status: 400 });
  }

  try {
    const result = await query(
      `UPDATE merchants
       SET status = $1
       WHERE merchant_id = $2
       RETURNING merchant_id, business_name, status`,
      [status, merchantId]
    );

    if (!result.rows[0]) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    await writeAdminAudit("merchant_status_updated", auth.user, {
      merchantId,
      status,
    });

    return NextResponse.json({
      message: "Merchant status updated",
      merchant: result.rows[0],
    });
  } catch (error) {
    console.error("Admin merchant update failed:", error.message);
    return NextResponse.json(
      { error: "Unable to update merchant" },
      { status: 500 }
    );
  }
}
