-- Small sample dataset for local development and SQL demonstrations.
-- Seed accounts receive random, unknown bcrypt-compatible hashes. Create real logins
-- through the app or replace these hashes with bcrypt output before a demo login.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO users (full_name, email, password_hash, role)
VALUES
    ('Demo Admin', 'admin@example.test', crypt(encode(gen_random_bytes(24), 'hex'), gen_salt('bf')), 'admin'),
    ('Bean & Book Merchant', 'beanbook@example.test', crypt(encode(gen_random_bytes(24), 'hex'), gen_salt('bf')), 'merchant'),
    ('Harbor Coffee Merchant', 'harbor@example.test', crypt(encode(gen_random_bytes(24), 'hex'), gen_salt('bf')), 'merchant'),
    ('Asha Customer', 'asha@example.test', crypt(encode(gen_random_bytes(24), 'hex'), gen_salt('bf')), 'customer'),
    ('Ravi Customer', 'ravi@example.test', crypt(encode(gen_random_bytes(24), 'hex'), gen_salt('bf')), 'customer')
ON CONFLICT DO NOTHING;

INSERT INTO merchants (user_id, business_name)
SELECT user_id, 'Bean & Book' FROM users WHERE email = 'beanbook@example.test'
ON CONFLICT DO NOTHING;

INSERT INTO merchants (user_id, business_name)
SELECT user_id, 'Harbor Coffee' FROM users WHERE email = 'harbor@example.test'
ON CONFLICT DO NOTHING;

INSERT INTO programs (merchant_id, program_name, points_name)
SELECT merchant_id, 'Bean & Book Rewards', 'BeanPoints'
FROM merchants WHERE business_name = 'Bean & Book'
ON CONFLICT DO NOTHING;

INSERT INTO programs (merchant_id, program_name, points_name)
SELECT merchant_id, 'Harbor Perks', 'HarborPoints'
FROM merchants WHERE business_name = 'Harbor Coffee'
ON CONFLICT DO NOTHING;

INSERT INTO wallets (user_id, program_id, balance)
SELECT u.user_id, p.program_id,
       CASE
           -- Asha's balances include the example exchange recorded below.
           WHEN u.email = 'asha@example.test' AND p.program_name = 'Bean & Book Rewards' THEN 1100
           WHEN u.email = 'asha@example.test' THEN 550
           WHEN u.email = 'ravi@example.test' AND p.program_name = 'Bean & Book Rewards' THEN 700
           ELSE 900
       END
FROM users u
CROSS JOIN programs p
WHERE u.email IN ('asha@example.test', 'ravi@example.test')
  AND p.program_name IN ('Bean & Book Rewards', 'Harbor Perks')
ON CONFLICT DO NOTHING;

INSERT INTO coupons
    (merchant_id, program_id, title, description, max_claims, expires_on, category, redemption_instructions)
SELECT m.merchant_id, p.program_id, 'Free pastry with any drink',
       'Choose one pastry when you purchase a drink at a participating location.',
       100, CURRENT_DATE + 90, 'food', 'Show the claimed coupon to the cashier before payment.'
FROM merchants m
JOIN programs p ON p.merchant_id = m.merchant_id
WHERE m.business_name = 'Harbor Coffee' AND p.program_name = 'Harbor Perks'
ON CONFLICT DO NOTHING;

INSERT INTO coupons
    (merchant_id, program_id, title, description, max_claims, expires_on, category, redemption_instructions)
SELECT m.merchant_id, p.program_id, '10% off a paperback',
       'Save 10% on one paperback book in store.',
       50, CURRENT_DATE + 120, 'books', 'Show the claimed coupon at checkout.'
FROM merchants m
JOIN programs p ON p.merchant_id = m.merchant_id
WHERE m.business_name = 'Bean & Book' AND p.program_name = 'Bean & Book Rewards'
ON CONFLICT DO NOTHING;

INSERT INTO user_coupons (user_id, coupon_id)
SELECT u.user_id, c.coupon_id
FROM users u
JOIN coupons c ON c.title = 'Free pastry with any drink'
WHERE u.email = 'asha@example.test'
ON CONFLICT DO NOTHING;

INSERT INTO exchange_rates (from_program_id, to_program_id, rate)
SELECT source.program_id, destination.program_id, 1.000000
FROM programs source CROSS JOIN programs destination
WHERE source.program_name = 'Bean & Book Rewards' AND destination.program_name = 'Harbor Perks'
ON CONFLICT DO NOTHING;

INSERT INTO exchange_rates (from_program_id, to_program_id, rate)
SELECT source.program_id, destination.program_id, 0.850000
FROM programs source CROSS JOIN programs destination
WHERE source.program_name = 'Harbor Perks' AND destination.program_name = 'Bean & Book Rewards'
ON CONFLICT DO NOTHING;

-- Illustrative only: the settlement amount/currency policy is provisional pending team agreement.
INSERT INTO transactions
    (user_id, from_wallet_id, from_program_id, to_wallet_id, to_program_id,
     exchange_rate_id, points_debited, points_credited, settlement_amount, settlement_currency)
SELECT customer.user_id,
       source_wallet.wallet_id, source_wallet.program_id,
       destination_wallet.wallet_id, destination_wallet.program_id,
       rate.exchange_rate_id, 100, 100, 10.00, 'INR'
FROM users customer
JOIN wallets source_wallet ON source_wallet.user_id = customer.user_id
JOIN programs source_program ON source_program.program_id = source_wallet.program_id
JOIN wallets destination_wallet ON destination_wallet.user_id = customer.user_id
JOIN programs destination_program ON destination_program.program_id = destination_wallet.program_id
JOIN exchange_rates rate ON rate.from_program_id = source_program.program_id
                        AND rate.to_program_id = destination_program.program_id
WHERE customer.email = 'asha@example.test'
  AND source_program.program_name = 'Bean & Book Rewards'
  AND destination_program.program_name = 'Harbor Perks'
  AND NOT EXISTS (
      SELECT 1 FROM transactions existing
      WHERE existing.user_id = customer.user_id
        AND existing.from_wallet_id = source_wallet.wallet_id
        AND existing.to_wallet_id = destination_wallet.wallet_id
  );

COMMIT;
