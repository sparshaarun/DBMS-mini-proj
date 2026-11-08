import { NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { requireRole } from "@/lib/auth-helpers";

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

  const userCouponId = Number(body?.userCouponId);
  if (!Number.isSafeInteger(userCouponId) || userCouponId <= 0) {
    return NextResponse.json({ error: "Choose a valid claimed coupon" }, { status: 400 });
  }

  try {
    const ownership = await query(
      `SELECT coupon_id
       FROM user_coupons uc
       WHERE uc.user_coupon_id = $2 AND uc.user_id = $1`,
      [auth.user.user_id, userCouponId]
    );
    // The database function performs the ownership check and changes only a valid claim.
    await query("SELECT redeem_coupon($1::BIGINT, $2::BIGINT)", [auth.user.user_id, userCouponId]);

    try {
      const { getMongoDb } = await import("@/lib/mongodb");
      const db = await getMongoDb();
      await db.collection("audit_logs").insertOne({
        eventType: "coupon_redeemed",
        timestamp: new Date(),
        actor: { userId: Number(auth.user.user_id), role: "customer" },
        details: { couponId: Number(ownership.rows[0].coupon_id), userCouponId },
      });
    } catch (auditError) {
      console.error("Coupon redeemed, but MongoDB audit logging failed:", auditError.message);
    }

    return NextResponse.json({ message: "Coupon redeemed successfully", userCouponId });
  } catch (error) {
    console.error("Coupon redemption failed:", error.message);
    const statuses = { "42501": 403, P0001: 409, "23514": 400 };
    const status = statuses[error.code] || 500;
    return NextResponse.json(
      { error: status === 500 ? "Unable to redeem this coupon right now" : error.message },
      { status }
    );
  }
}
