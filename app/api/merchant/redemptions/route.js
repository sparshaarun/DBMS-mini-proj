import { NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { requireMerchant } from "@/lib/merchant-helpers";

export async function GET(request) {
  const auth = await requireMerchant();

  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const params = new URL(request.url).searchParams;
  const status = (params.get("status") || "").trim().toLowerCase();

  if (status && !["claimed", "redeemed", "expired"].includes(status)) {
    return NextResponse.json(
      { error: "Choose a valid redemption status" },
      { status: 400 }
    );
  }

  try {
    const result = await query(
      `SELECT uc.user_coupon_id, uc.status, uc.claimed_at, uc.redeemed_at,
              c.coupon_id, c.title, c.category,
              u.user_id, u.full_name, u.email
       FROM user_coupons uc
       JOIN coupons c ON c.coupon_id = uc.coupon_id
       JOIN users u ON u.user_id = uc.user_id
       WHERE c.merchant_id = $1
         AND ($2::TEXT = '' OR uc.status = $2)
       ORDER BY COALESCE(uc.redeemed_at, uc.claimed_at) DESC
       LIMIT 200`,
      [auth.merchant.merchant_id, status]
    );

    return NextResponse.json({ redemptions: result.rows });
  } catch (error) {
    console.error("Merchant redemptions query failed:", error.message);
    return NextResponse.json(
      { error: "Unable to load redemptions" },
      { status: 500 }
    );
  }
}
