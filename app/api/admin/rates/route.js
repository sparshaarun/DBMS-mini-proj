import { NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { requireAdmin, writeAdminAudit } from "@/lib/admin-helpers";

const ratePattern = /^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/;

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const [programs, rates] = await Promise.all([
      query(
        `SELECT p.program_id, p.program_name, p.points_name, m.business_name
         FROM programs p
         JOIN merchants m ON m.merchant_id = p.merchant_id
         WHERE p.status = 'active' AND m.status = 'active'
         ORDER BY m.business_name, p.program_name`
      ),
      query(
        `SELECT r.exchange_rate_id, r.from_program_id, source.program_name AS from_program,
                source.points_name AS from_points, source_merchant.business_name AS from_merchant,
                r.to_program_id, destination.program_name AS to_program,
                destination.points_name AS to_points, destination_merchant.business_name AS to_merchant,
                r.rate, r.active, r.updated_at
         FROM exchange_rates r
         JOIN programs source ON source.program_id = r.from_program_id
         JOIN merchants source_merchant ON source_merchant.merchant_id = source.merchant_id
         JOIN programs destination ON destination.program_id = r.to_program_id
         JOIN merchants destination_merchant ON destination_merchant.merchant_id = destination.merchant_id
         ORDER BY source_merchant.business_name, source.program_name,
                  destination_merchant.business_name, destination.program_name`
      ),
    ]);

    return NextResponse.json({ programs: programs.rows, rates: rates.rows });
  } catch (error) {
    console.error("Admin exchange rates lookup failed:", error.message);
    return NextResponse.json({ error: "Unable to load exchange rates" }, { status: 500 });
  }
}

export async function POST(request) {
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

  const fromProgramId = Number(body?.fromProgramId);
  const toProgramId = Number(body?.toProgramId);
  const rate = String(body?.rate ?? "").trim();
  const nonZeroRate = rate.replace(/[.0]/g, "").length > 0;

  if (!Number.isSafeInteger(fromProgramId) || fromProgramId <= 0 ||
      !Number.isSafeInteger(toProgramId) || toProgramId <= 0 ||
      fromProgramId === toProgramId || !ratePattern.test(rate) || !nonZeroRate) {
    return NextResponse.json(
      { error: "Choose two different active programs and enter a positive rate with up to 6 decimal places" },
      { status: 400 }
    );
  }

  try {
    const result = await query(
      `INSERT INTO exchange_rates (from_program_id, to_program_id, rate)
       SELECT source.program_id, destination.program_id, $3::NUMERIC(18, 6)
       FROM programs source
       JOIN merchants source_merchant ON source_merchant.merchant_id = source.merchant_id
       CROSS JOIN programs destination
       JOIN merchants destination_merchant ON destination_merchant.merchant_id = destination.merchant_id
       WHERE source.program_id = $1 AND destination.program_id = $2
         AND source.status = 'active' AND source_merchant.status = 'active'
         AND destination.status = 'active' AND destination_merchant.status = 'active'
       ON CONFLICT (from_program_id, to_program_id)
       DO UPDATE SET rate = EXCLUDED.rate, active = TRUE, updated_at = CURRENT_TIMESTAMP
       RETURNING exchange_rate_id, from_program_id, to_program_id, rate, active, updated_at`,
      [fromProgramId, toProgramId, rate]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "One or both programs are missing or inactive" },
        { status: 404 }
      );
    }

    const exchangeRate = result.rows[0];
    await writeAdminAudit("exchange_rate_updated", auth.user, {
      exchangeRateId: Number(exchangeRate.exchange_rate_id),
      fromProgramId,
      toProgramId,
      rate: String(exchangeRate.rate),
    });

    return NextResponse.json({ exchangeRate }, { status: 200 });
  } catch (error) {
    console.error("Admin exchange rate update failed:", error.message);
    const status = ["22003", "23514", "22023"].includes(error.code) ? 400 : 500;
    return NextResponse.json(
      { error: status === 400 ? "The exchange rate is outside the allowed range" : "Unable to save exchange rate" },
      { status }
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

  const exchangeRateId = Number(body?.exchangeRateId);
  if (!Number.isSafeInteger(exchangeRateId) || exchangeRateId <= 0 || typeof body?.active !== "boolean") {
    return NextResponse.json({ error: "A valid exchange rate ID and active status are required" }, { status: 400 });
  }

  try {
    const result = await query(
      `UPDATE exchange_rates
       SET active = $1, updated_at = CURRENT_TIMESTAMP
       WHERE exchange_rate_id = $2
       RETURNING exchange_rate_id, from_program_id, to_program_id, rate, active, updated_at`,
      [body.active, exchangeRateId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Exchange rate was not found" }, { status: 404 });
    }

    const exchangeRate = result.rows[0];
    await writeAdminAudit("exchange_rate_status_updated", auth.user, {
      exchangeRateId,
      active: exchangeRate.active,
    });

    return NextResponse.json({ exchangeRate });
  } catch (error) {
    console.error("Admin exchange rate status update failed:", error.message);
    return NextResponse.json({ error: "Unable to update exchange rate status" }, { status: 500 });
  }
}
