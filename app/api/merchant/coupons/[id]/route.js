import { NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import {
  requireMerchant,
  writeMerchantAudit,
} from "@/lib/merchant-helpers";

const categories = new Set([
  "food", "shopping", "books", "travel", "other", "general",
]);

export async function PATCH(request, context) {
  const auth = await requireMerchant();

  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const couponId = Number(id);

  if (!Number.isSafeInteger(couponId) || couponId <= 0) {
    return NextResponse.json({ error: "Invalid coupon ID" }, { status: 400 });
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

  const allowedFields = [
    "title", "description", "category",
    "redemptionInstructions", "maxClaims", "expiresOn", "status",
  ];

  const suppliedFields = allowedFields.filter((field) =>
    Object.hasOwn(body || {}, field)
  );

  if (suppliedFields.length === 0) {
    return NextResponse.json(
      { error: "Provide at least one supported field to update" },
      { status: 400 }
    );
  }

  try {
    const existingResult = await query(
      `SELECT * FROM coupons
       WHERE coupon_id = $1 AND merchant_id = $2`,
      [couponId, auth.merchant.merchant_id]
    );

    const existing = existingResult.rows[0];

    if (!existing) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    const updates = [];
    const values = [];

    function addUpdate(column, value) {
      values.push(value);
      updates.push(`${column} = $${values.length}`);
    }

    if (Object.hasOwn(body, "title")) {
      const value = typeof body.title === "string" ? body.title.trim() : "";
      if (!value || value.length > 150) {
        return NextResponse.json({ error: "Title is required (max 150 characters)" }, { status: 400 });
      }
      addUpdate("title", value);
    }

    if (Object.hasOwn(body, "description")) {
      const value = typeof body.description === "string" ? body.description.trim() : "";
      if (!value || value.length > 2000) {
        return NextResponse.json({ error: "Description is required (max 2000 characters)" }, { status: 400 });
      }
      addUpdate("description", value);
    }

    if (Object.hasOwn(body, "category")) {
      const value = typeof body.category === "string" ? body.category.trim().toLowerCase() : "";
      if (!categories.has(value)) {
        return NextResponse.json({ error: "Choose a valid coupon category" }, { status: 400 });
      }
      addUpdate("category", value);
    }

    if (Object.hasOwn(body, "redemptionInstructions")) {
      const value = typeof body.redemptionInstructions === "string"
        ? body.redemptionInstructions.trim() || null
        : null;

      if (body.redemptionInstructions !== null &&
          typeof body.redemptionInstructions !== "string") {
        return NextResponse.json({ error: "Redemption instructions must be text" }, { status: 400 });
      }

      if (value && value.length > 1000) {
        return NextResponse.json({ error: "Redemption instructions cannot exceed 1000 characters" }, { status: 400 });
      }
      addUpdate("redemption_instructions", value);
    }

    if (Object.hasOwn(body, "maxClaims")) {
      const value = body.maxClaims === null || body.maxClaims === ""
        ? null
        : Number(body.maxClaims);

      if (value !== null &&
          (!Number.isSafeInteger(value) ||
           value <= 0 ||
           value < Number(existing.claimed_count))) {
        return NextResponse.json(
          { error: "Maximum claims must be positive and cannot be lower than the existing claim count" },
          { status: 400 }
        );
      }
      addUpdate("max_claims", value);
    }

    if (Object.hasOwn(body, "expiresOn")) {
      const value = body.expiresOn;
      if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        Number.isNaN(Date.parse(`${value}T00:00:00Z`)) ||
        new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value
      ) {
        return NextResponse.json({ error: "Provide a valid expiry date" }, { status: 400 });
      }
      addUpdate("expires_on", value);
    }

    if (Object.hasOwn(body, "status")) {
      if (!["active", "inactive"].includes(body.status)) {
        return NextResponse.json({ error: "Status must be active or inactive" }, { status: 400 });
      }
      addUpdate("status", body.status);
    }

    values.push(couponId);
    const couponParam = values.length;
    values.push(auth.merchant.merchant_id);
    const merchantParam = values.length;

    const result = await query(
      `UPDATE coupons
       SET ${updates.join(", ")}
       WHERE coupon_id = $${couponParam}
         AND merchant_id = $${merchantParam}
       RETURNING *`,
      values
    );

    const coupon = result.rows[0];

    await writeMerchantAudit("coupon_updated", auth.user, {
      merchantId: Number(auth.merchant.merchant_id),
      couponId,
      changes: suppliedFields,
    });

    return NextResponse.json({
      message: "Coupon updated successfully",
      coupon,
    });
  } catch (error) {
    console.error("Merchant coupon update failed:", error.message);

    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A coupon with this title and expiry date already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Unable to update coupon" },
      { status: 500 }
    );
  }
}
