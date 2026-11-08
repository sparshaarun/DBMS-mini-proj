import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { loadExchangeQuote } from "../exchange-data";

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

  try {
    const preview = await loadExchangeQuote(
      auth.user.user_id, fromWalletId, toWalletId, points
    );

    if (!preview) {
      return NextResponse.json(
        { error: "One or both wallets do not belong to your account" },
        { status: 404 }
      );
    }

    if (preview.exchange_rate === null) {
      return NextResponse.json(
        { error: "There is no active exchange rate for these programs" },
        { status: 409 }
      );
    }

    if (BigInt(preview.points_credited) <= 0n) {
      return NextResponse.json(
        { error: "This amount would credit less than one point" },
        { status: 400 }
      );
    }

    if (BigInt(preview.points_credited) > BigInt(Number.MAX_SAFE_INTEGER)) {
      return NextResponse.json(
        { error: "Exchange amount is too large" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      preview: {
        fromWalletId: preview.from_wallet_id,
        fromProgram: preview.from_program_name,
        fromPointsName: preview.from_points_name,
        fromMerchant: preview.from_merchant_name,
        pointsDebited: String(points),
        availablePoints: preview.source_balance,
        toWalletId: preview.to_wallet_id,
        toProgram: preview.to_program_name,
        toPointsName: preview.to_points_name,
        toMerchant: preview.to_merchant_name,
        pointsCredited: preview.points_credited,
        exchangeRate: preview.exchange_rate,
        hasEnoughPoints: preview.has_enough_points,
      },
    });
  } catch (error) {
    console.error("Exchange preview failed:", error.message);
    if (error.code === "22003") {
      return NextResponse.json({ error: "Exchange amount is too large" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Unable to preview this exchange right now" },
      { status: 500 }
    );
  }
}
