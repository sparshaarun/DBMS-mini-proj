-- Reusable summaries and indexes for customer, merchant, and admin screens.
-- Apply after schema.sql, alter.sql, and triggers.sql.

BEGIN;

CREATE OR REPLACE VIEW customer_wallet_summary AS
SELECT w.user_id, w.wallet_id, p.program_id, p.program_name, p.points_name,
       m.merchant_id, m.business_name, w.balance, w.updated_at
FROM wallets w
JOIN programs p ON p.program_id = w.program_id
JOIN merchants m ON m.merchant_id = p.merchant_id;

CREATE OR REPLACE VIEW merchant_coupon_redemption_summary AS
SELECT c.merchant_id, c.coupon_id, c.title, c.status AS coupon_status, c.expires_on,
       COUNT(uc.user_coupon_id) AS claimed_count,
       COUNT(uc.user_coupon_id) FILTER (WHERE uc.status = 'redeemed') AS redeemed_count
FROM coupons c
LEFT JOIN user_coupons uc ON uc.coupon_id = c.coupon_id
GROUP BY c.merchant_id, c.coupon_id, c.title, c.status, c.expires_on;

CREATE OR REPLACE VIEW merchant_settlement_summary AS
SELECT s.debtor_merchant_id AS merchant_id, 'owes'::TEXT AS direction,
       s.currency, s.status, SUM(s.amount) AS total_amount, COUNT(*) AS settlement_count
FROM settlements s
GROUP BY s.debtor_merchant_id, s.currency, s.status
UNION ALL
SELECT s.creditor_merchant_id AS merchant_id, 'owed'::TEXT AS direction,
       s.currency, s.status, SUM(s.amount) AS total_amount, COUNT(*) AS settlement_count
FROM settlements s
GROUP BY s.creditor_merchant_id, s.currency, s.status;

CREATE INDEX IF NOT EXISTS transactions_from_wallet_created_idx
    ON transactions(from_wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS transactions_to_wallet_created_idx
    ON transactions(to_wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS settlements_debtor_status_idx
    ON settlements(debtor_merchant_id, status, period_start);
CREATE INDEX IF NOT EXISTS settlements_creditor_status_idx
    ON settlements(creditor_merchant_id, status, period_start);
CREATE INDEX IF NOT EXISTS coupons_search_gin_idx
    ON coupons USING GIN (
        to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(category, ''))
    );

COMMIT;
