import { query } from "@/lib/postgres";

// Load only wallets owned by this customer and the current active rate.
export async function loadExchangeQuote(userId, fromWalletId, toWalletId, points) {
  const result = await query(
    `SELECT source.wallet_id AS from_wallet_id,
            source.program_id AS from_program_id,
            source.balance AS source_balance,
            source_program.program_name AS from_program_name,
            source_program.points_name AS from_points_name,
            source_program.merchant_id AS from_merchant_id,
            source_merchant.business_name AS from_merchant_name,
            destination.wallet_id AS to_wallet_id,
            destination.program_id AS to_program_id,
            destination_program.program_name AS to_program_name,
            destination_program.points_name AS to_points_name,
            destination_program.merchant_id AS to_merchant_id,
            destination_merchant.business_name AS to_merchant_name,
            rate.rate AS exchange_rate,
            CASE WHEN rate.exchange_rate_id IS NULL THEN NULL
                 ELSE ROUND($3::NUMERIC * rate.rate)::BIGINT
            END AS points_credited,
            source.balance >= $3 AS has_enough_points
     FROM wallets source
     JOIN programs source_program ON source_program.program_id = source.program_id
     JOIN merchants source_merchant ON source_merchant.merchant_id = source_program.merchant_id
     JOIN wallets destination
       ON destination.wallet_id = $2 AND destination.user_id = $4
     JOIN programs destination_program ON destination_program.program_id = destination.program_id
     JOIN merchants destination_merchant ON destination_merchant.merchant_id = destination_program.merchant_id
     LEFT JOIN exchange_rates rate
       ON rate.from_program_id = source.program_id
      AND rate.to_program_id = destination.program_id
      AND rate.active = TRUE
     WHERE source.wallet_id = $1 AND source.user_id = $4`,
    [fromWalletId, toWalletId, points, userId]
  );

  return result.rows[0] ?? null;
}
