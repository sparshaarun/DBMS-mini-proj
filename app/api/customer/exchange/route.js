import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { query } from "@/lib/postgres";
import { getMongoDb } from "@/lib/mongodb";
import { loadExchangeQuote } from "./exchange-data";

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

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
  }

  const fromWalletId = Number(body.fromWalletId);
  const toWalletId = Number(body.toWalletId);
  const points = Number(body.points);

  if (!Number.isSafeInteger(fromWalletId) || fromWalletId <= 0 ||
      !Number.isSafeInteger(toWalletId) || toWalletId <= 0 ||
      !Number.isSafeInteger(points) || points <= 0) {
    return NextResponse.json(
      { error: "Choose two valid wallets and enter a positive whole number of points" },
      { status: 400 }
    );
  }

  if (fromWalletId === toWalletId) {
    return NextResponse.json({ error: "Choose two different wallets" }, { status: 400 });
  }

  const currency = process.env.SETTLEMENT_CURRENCY?.trim().toUpperCase();
  const pointValue = process.env.SETTLEMENT_VALUE_PER_POINT?.trim();
  if (!currency || !/^[A-Z]{3}$/.test(currency) ||
      !pointValue || !/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/.test(pointValue) ||
      Number(pointValue) <= 0) {
    return NextResponse.json(
      { error: "Settlement settings are missing or invalid on the server" },
      { status: 503 }
    );
  }

  try {
    const quote = await loadExchangeQuote(
      auth.user.user_id, fromWalletId, toWalletId, points
    );

    if (!quote) {
      return NextResponse.json(
        { error: "One or both wallets do not belong to your account" },
        { status: 404 }
      );
    }

    if (quote.exchange_rate === null) {
      return NextResponse.json(
        { error: "There is no active exchange rate for these programs" },
        { status: 409 }
      );
    }

    if (BigInt(quote.points_credited) <= 0n) {
      return NextResponse.json(
        { error: "This amount would credit less than one point" },
        { status: 400 }
      );
    }

    if (BigInt(quote.points_credited) > BigInt(Number.MAX_SAFE_INTEGER)) {
      return NextResponse.json({ error: "Exchange amount is too large" }, { status: 400 });
    }

    if (!quote.has_enough_points) {
      return NextResponse.json(
        { error: `Insufficient points. Your source wallet has ${quote.source_balance}.` },
        { status: 409 }
      );
    }

    // Cross-merchant settlement is based on debited source points. Same-merchant
    // transfers have no inter-merchant amount. The browser cannot supply this value.
    const amountResult = await query(
      `SELECT CASE WHEN $3::BIGINT = $4::BIGINT THEN 0::NUMERIC(14, 2)
                   ELSE ROUND($1::NUMERIC * $2::NUMERIC, 2)::NUMERIC(14, 2)
              END AS settlement_amount`,
      [points, pointValue, quote.from_merchant_id, quote.to_merchant_id]
    );
    const settlementAmount = amountResult.rows[0].settlement_amount;

    const exchangeResult = await query(
      `SELECT exchange_points(
          $1::BIGINT, $2::BIGINT, $3::BIGINT, $4::BIGINT,
          $5::NUMERIC(14, 2), $6::CHAR(3)
       ) AS transaction_id`,
      [auth.user.user_id, fromWalletId, toWalletId, points, settlementAmount, currency]
    );
    const transactionId = exchangeResult.rows[0].transaction_id;

    // PostgreSQL completes the exchange atomically. MongoDB audit logging is best effort
    // so a log connection failure cannot make a completed exchange look failed to retry.
    try {
      const db = await getMongoDb();
      const numericUserId = Number(auth.user.user_id);
      await db.collection("audit_logs").insertOne({
        eventType: "points_exchanged",
        timestamp: new Date(),
        actor: {
          userId: Number.isSafeInteger(numericUserId) ? numericUserId : String(auth.user.user_id),
          role: "customer",
        },
        details: {
          transactionId: String(transactionId),
          fromWalletId,
          toWalletId,
          pointsDebited: points,
          pointsCredited: Number(quote.points_credited),
          settlementAmount: String(settlementAmount),
          currency,
        },
      });
    } catch (auditError) {
      console.error("Exchange completed, but MongoDB audit logging failed:", auditError.message);
    }

    return NextResponse.json(
      {
        message: "Points exchanged successfully",
        transactionId,
        pointsDebited: String(points),
        pointsCredited: quote.points_credited,
        fromPointsName: quote.from_points_name,
        toPointsName: quote.to_points_name,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Point exchange failed:", error.message);
    const clientErrors = {
      "22003": 400,
      "22023": 400,
      "23514": 400,
      "23505": 409,
      "42501": 403,
      P0001: 409,
    };
    const status = clientErrors[error.code] || 500;
    return NextResponse.json(
      { error: status === 500 ? "Unable to complete this exchange right now" : error.message },
      { status }
    );
  }
}
