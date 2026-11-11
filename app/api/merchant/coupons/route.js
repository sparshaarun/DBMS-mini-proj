import { NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import {
  requireMerchant,
  writeMerchantAudit,
} from "@/lib/merchant-helpers";

const categories = new Set([
  "food", "shopping", "books", "travel", "other", "general",
]);

export async function GET() {
  const auth = await requireMerchant();

  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const result = await query(
      `SELECT c.coupon_id, c.title, c.description, c.category,
              c.redemption_instructions, c.max_claims, c.claimed_count,
              c.expires_on, c.status, c.created_at,
              p.program_id, p.program_name, p.points_name,
              COALESCE(r.redeemed_count, 0)::BIGINT AS redeemed_count
       FROM coupons c
       JOIN programs p ON p.program_id = c.program_id
       LEFT JOIN merchant_coupon_redemption_summary r
         ON r.coupon_id = c.coupon_id
       WHERE c.merchant_id = $1
       ORDER BY c.created_at DESC`,
      [auth.merchant.merchant_id]
    );

    const programsResult = await query(
      `SELECT program_id, program_name, points_name, status
       FROM programs
       WHERE merchant_id = $1
       ORDER BY program_name`,
      [auth.merchant.merchant_id]
    );

    return NextResponse.json({
      coupons: result.rows,
      programs: programsResult.rows,
    });
  } catch (error) {
    console.error("Merchant coupons query failed:", error.message);
    return NextResponse.json(
      { error: "Unable to load coupons" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const auth = await requireMerchant();

  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const description =
    typeof body?.description === "string" ? body.description.trim() : "";
  const category =
    typeof body?.category === "string"
      ? body.category.trim().toLowerCase()
      : "general";
  const instructions =
    typeof body?.redemptionInstructions === "string"
      ? body.redemptionInstructions.trim()
      : null;
  const programId = Number(body?.programId);
  const maxClaims =
    body?.maxClaims === null || body?.maxClaims === undefined ||
    body?.maxClaims === ""
      ? null
      : Number(body.maxClaims);
  const expiresOn = body?.expiresOn;

  if (!title || title.length > 150 || !description || description.length > 2000) {
    return NextResponse.json(
      { error: "Provide a title (max 150 characters) and description (max 2000 characters)" },
      { status: 400 }
    );
  }

  if (!categories.has(category)) {
    return NextResponse.json(
      { error: "Choose a valid coupon category" },
      { status: 400 }
    );
  }

  if (!Number.isSafeInteger(programId) || programId <= 0) {
    return NextResponse.json({ error: "Choose a valid program" }, { status: 400 });
  }

  if (
    maxClaims !== null &&
    (!Number.isSafeInteger(maxClaims) || maxClaims <= 0)
  ) {
    return NextResponse.json(
      { error: "Maximum claims must be a positive whole number or null" },
      { status: 400 }
    );
  }

  if (
    typeof expiresOn !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(expiresOn) ||
    Number.isNaN(Date.parse(`${expiresOn}T00:00:00Z`)) ||
    new Date(`${expiresOn}T00:00:00Z`).toISOString().slice(0, 10) !== expiresOn ||
    expiresOn < new Date().toISOString().slice(0, 10)
  ) {
    return NextResponse.json(
      { error: "Provide a valid expiry date that is today or later" },
      { status: 400 }
    );
  }

  if (instructions && instructions.length > 1000) {
    return NextResponse.json(
      { error: "Redemption instructions cannot exceed 1000 characters" },
      { status: 400 }
    );
  }

  try {
    const program = await query(
      `SELECT program_id
       FROM programs
       WHERE program_id = $1
         AND merchant_id = $2
         AND status = 'active'`,
      [programId, auth.merchant.merchant_id]
    );

    if (program.rows.length === 0) {
      return NextResponse.json(
        { error: "Choose an active program belonging to your business" },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO coupons
         (merchant_id, program_id, title, description, category,
          redemption_instructions, max_claims, expires_on)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        auth.merchant.merchant_id,
        programId,
        title,
        description,
        category,
        instructions || null,
        maxClaims,
        expiresOn,
      ]
    );

    const coupon = result.rows[0];

    await writeMerchantAudit("coupon_created", auth.user, {
      merchantId: Number(auth.merchant.merchant_id),
      couponId: Number(coupon.coupon_id),
      title: coupon.title,
    });

    return NextResponse.json(
      { message: "Coupon created successfully", coupon },
      { status: 201 }
    );
  } catch (error) {
    console.error("Merchant coupon creation failed:", error.message);

    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A coupon with this title and expiry date already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Unable to create coupon" },
      { status: 500 }
    );
  }
}
