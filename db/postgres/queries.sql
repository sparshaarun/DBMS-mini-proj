-- Examples for customer, merchant, and admin screens.
-- Run after schema.sql, alter.sql, triggers.sql, views_indexes.sql, and seed.sql.

-- INSERT, UPDATE, and DELETE demonstration. This block is rolled back.
BEGIN;

INSERT INTO coupons
    (merchant_id, program_id, title, description, max_claims, expires_on, category, redemption_instructions)
SELECT m.merchant_id, p.program_id, 'Viva SQL Demo Coupon',
       'Temporary coupon used to demonstrate INSERT, UPDATE, and DELETE.',
       5, CURRENT_DATE + 30, 'other', 'Do not use; this row is rolled back.'
FROM merchants m
JOIN programs p ON p.merchant_id = m.merchant_id
WHERE m.business_name = 'Bean & Book' AND p.program_name = 'Bean & Book Rewards'
ON CONFLICT DO NOTHING;

UPDATE coupons
   SET description = 'Updated temporarily as a SQL example.'
 WHERE title = 'Viva SQL Demo Coupon'
   AND merchant_id = (SELECT merchant_id FROM merchants WHERE business_name = 'Bean & Book');

DELETE FROM coupons
 WHERE title = 'Viva SQL Demo Coupon'
   AND merchant_id = (SELECT merchant_id FROM merchants WHERE business_name = 'Bean & Book');

ROLLBACK;

-- SELECT with JOIN: show a customer's program balances.
SELECT business_name, program_name, points_name, balance
FROM customer_wallet_summary
WHERE user_id = (SELECT user_id FROM users WHERE email = 'asha@example.test')
ORDER BY business_name, program_name;

-- Exchange history with source and destination program names.
SELECT t.transaction_id, t.created_at, source.program_name AS source_program,
       t.points_debited, destination.program_name AS destination_program,
       t.points_credited, t.settlement_amount, t.settlement_currency
FROM transactions t
JOIN programs source ON source.program_id = t.from_program_id
JOIN programs destination ON destination.program_id = t.to_program_id
WHERE t.user_id = (SELECT user_id FROM users WHERE email = 'asha@example.test')
ORDER BY t.created_at DESC;

-- GROUP BY and aggregates: points held by each customer across programs.
SELECT u.user_id, u.full_name, SUM(w.balance) AS total_points,
       COUNT(w.wallet_id) AS wallet_count, AVG(w.balance) AS average_wallet_balance
FROM users u
JOIN wallets w ON w.user_id = u.user_id
WHERE u.role = 'customer'
GROUP BY u.user_id, u.full_name
ORDER BY total_points DESC;

-- HAVING: merchants whose coupons have at least one redemption.
SELECT m.merchant_id, m.business_name, SUM(r.redeemed_count) AS total_redemptions
FROM merchants m
JOIN merchant_coupon_redemption_summary r ON r.merchant_id = m.merchant_id
GROUP BY m.merchant_id, m.business_name
HAVING SUM(r.redeemed_count) >= 1
ORDER BY total_redemptions DESC;

-- Subquery: active coupons Asha has not claimed yet.
SELECT c.coupon_id, c.title, c.description, c.category, c.expires_on
FROM coupons c
WHERE c.status = 'active' AND c.expires_on >= CURRENT_DATE
  AND NOT EXISTS (
      SELECT 1 FROM user_coupons uc
      WHERE uc.coupon_id = c.coupon_id
        AND uc.user_id = (SELECT user_id FROM users WHERE email = 'asha@example.test')
  )
ORDER BY c.expires_on, c.title;

-- Full-text search uses the same expression as coupons_search_gin_idx.
SELECT c.coupon_id, c.title, c.description,
       ts_rank(
           to_tsvector('english', COALESCE(c.title, '') || ' ' || COALESCE(c.description, '') || ' ' || COALESCE(c.category, '')),
           plainto_tsquery('english', 'pastry drink')
       ) AS relevance
FROM coupons c
WHERE to_tsvector(
          'english',
          COALESCE(c.title, '') || ' ' || COALESCE(c.description, '') || ' ' || COALESCE(c.category, '')
      ) @@ plainto_tsquery('english', 'pastry drink')
ORDER BY relevance DESC, c.expires_on;

-- Trigger audit trail for balance changes.
SELECT a.changed_at, a.wallet_id, a.old_balance, a.new_balance, u.full_name AS changed_by
FROM wallet_balance_audit a
LEFT JOIN users u ON u.user_id = a.changed_by
ORDER BY a.changed_at DESC
LIMIT 20;
