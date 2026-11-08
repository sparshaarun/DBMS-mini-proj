-- Demonstrates that an explicit ROLLBACK undoes wallet changes, transaction rows,
-- and trigger audit rows. Requires the sample data and exchange_points() function.

BEGIN;

SELECT exchange_points(
    (SELECT user_id FROM users WHERE email = 'asha@example.test'),
    (
        SELECT w.wallet_id
          FROM wallets w
          JOIN programs p ON p.program_id = w.program_id
          JOIN merchants m ON m.merchant_id = p.merchant_id
         WHERE w.user_id = (SELECT user_id FROM users WHERE email = 'asha@example.test')
           AND m.business_name = 'Bean & Book'
           AND p.program_name = 'Bean & Book Rewards'
    ),
    (
        SELECT w.wallet_id
          FROM wallets w
          JOIN programs p ON p.program_id = w.program_id
          JOIN merchants m ON m.merchant_id = p.merchant_id
         WHERE w.user_id = (SELECT user_id FROM users WHERE email = 'asha@example.test')
           AND m.business_name = 'Harbor Coffee'
           AND p.program_name = 'Harbor Perks'
    ),
    10,
    1.00,
    'INR'
);

ROLLBACK;
