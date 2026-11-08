import { NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { requireRole } from "@/lib/auth-helpers";

const categories = new Set(["food", "shopping", "books", "travel", "other", "general"]);

export async function GET(request) {
  const auth = await requireRole(["customer"]);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const params = new URL(request.url).searchParams;
  const search = (params.get("q") || "").trim().slice(0, 100);
  const requestedCategory = (params.get("category") || "").trim().toLowerCase();
  if (requestedCategory && !categories.has(requestedCategory)) {
    return NextResponse.json({ error: "Choose a valid coupon category" }, { status: 400 });
  }

  try {
    const result = await query(
      `SELECT c.coupon_id, c.title, c.description, c.category,
              c.expires_on, c.max_claims, c.claimed_count,
              c.redemption_instructions, m.business_name, p.program_name,
              uc.user_coupon_id, uc.status AS claim_status
       FROM coupons c
       JOIN merchants m ON m.merchant_id = c.merchant_id
       JOIN programs p ON p.program_id = c.program_id
       LEFT JOIN user_coupons uc
         ON uc.coupon_id = c.coupon_id AND uc.user_id = $1
       WHERE c.status = 'active' AND c.expires_on >= CURRENT_DATE
         AND ($2::TEXT = '' OR
              to_tsvector('english', coalesce(c.title, '') || ' ' ||
                          coalesce(c.description, '') || ' ' || coalesce(c.category, ''))
                @@ plainto_tsquery('english', $2) OR
              m.business_name ILIKE '%' || $2 || '%' OR
              p.program_name ILIKE '%' || $2 || '%')
         AND ($3::TEXT = '' OR c.category = $3)
       ORDER BY c.expires_on, c.title
       LIMIT 100`,
      [auth.user.user_id, search, requestedCategory]
    );

    return NextResponse.json({ coupons: result.rows });
  } catch (error) {
    console.error("Customer coupon search failed:", error.message);
    return NextResponse.json({ error: "Unable to load coupons right now" }, { status: 500 });
  }
}

export async function POST(request) {
  const auth = await requireRole(["customer"]);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const couponId = Number(body?.couponId);
  if (!Number.isSafeInteger(couponId) || couponId <= 0) {
    return NextResponse.json({ error: "Choose a valid coupon" }, { status: 400 });
  }

  try {
    const result = await query(
      "SELECT claim_coupon($1::BIGINT, $2::BIGINT) AS user_coupon_id",
      [auth.user.user_id, couponId]
    );
    const userCouponId = result.rows[0].user_coupon_id;

    try {
      const { getMongoDb } = await import("@/lib/mongodb");
      const db = await getMongoDb();
      await db.collection("audit_logs").insertOne({
        eventType: "coupon_claimed",
        timestamp: new Date(),
        actor: { userId: Number(auth.user.user_id), role: "customer" },
        details: { couponId, userCouponId: Number(userCouponId) },
      });
    } catch (auditError) {
      console.error("Coupon claimed, but MongoDB audit logging failed:", auditError.message);
    }

    return NextResponse.json({ message: "Coupon claimed successfully", userCouponId }, { status: 201 });
  } catch (error) {
    console.error("Coupon claim failed:", error.message);
    const statuses = { "23505": 409, "42501": 403, P0001: 409, "23514": 400 };
    const status = statuses[error.code] || 500;
    return NextResponse.json(
      { error: status === 500 ? "Unable to claim this coupon right now" : error.message },
      { status }
    );
  }
}
