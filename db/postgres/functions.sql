-- Atomic loyalty point exchange.
-- Apply after schema.sql, alter.sql, and triggers.sql.

BEGIN;

CREATE OR REPLACE FUNCTION exchange_points(
    p_user_id BIGINT,
    p_from_wallet_id BIGINT,
    p_to_wallet_id BIGINT,
    p_points_debited BIGINT,
    p_settlement_amount NUMERIC(14, 2),
    p_settlement_currency CHAR(3)
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_source_balance BIGINT;
    v_source_program_id BIGINT;
    v_destination_program_id BIGINT;
    v_rate_id BIGINT;
    v_rate NUMERIC(18, 6);
    v_points_credited BIGINT;
    v_source_merchant_id BIGINT;
    v_destination_merchant_id BIGINT;
    v_transaction_id BIGINT;
    v_settlement_id BIGINT;
    v_period_start DATE;
    v_period_end DATE;
BEGIN
    IF p_points_debited IS NULL OR p_points_debited <= 0 THEN
        RAISE EXCEPTION 'Points to exchange must be a positive whole number'
            USING ERRCODE = '22023';
    END IF;

    IF p_from_wallet_id = p_to_wallet_id THEN
        RAISE EXCEPTION 'Choose two different wallets for an exchange'
            USING ERRCODE = '22023';
    END IF;

    IF p_settlement_amount IS NULL OR p_settlement_amount < 0 THEN
        RAISE EXCEPTION 'Settlement amount must be zero or greater'
            USING ERRCODE = '22023';
    END IF;

    IF p_settlement_currency IS NULL
       OR p_settlement_currency::TEXT !~ '^[A-Z]{3}$' THEN
        RAISE EXCEPTION 'Settlement currency must be a three-letter uppercase code'
            USING ERRCODE = '22023';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM users WHERE user_id = p_user_id AND role = 'customer'
    ) THEN
        RAISE EXCEPTION 'Only a registered customer can exchange points'
            USING ERRCODE = '42501';
    END IF;

    -- Lock both wallets in ID order to reduce deadlocks between concurrent exchanges.
    PERFORM 1
      FROM wallets
     WHERE wallet_id IN (p_from_wallet_id, p_to_wallet_id)
     ORDER BY wallet_id
     FOR UPDATE;

    SELECT balance, program_id
      INTO v_source_balance, v_source_program_id
      FROM wallets
     WHERE wallet_id = p_from_wallet_id AND user_id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Source wallet does not belong to this customer'
            USING ERRCODE = '42501';
    END IF;

    SELECT program_id
      INTO v_destination_program_id
      FROM wallets
     WHERE wallet_id = p_to_wallet_id AND user_id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Destination wallet does not belong to this customer'
            USING ERRCODE = '42501';
    END IF;

    IF v_source_balance < p_points_debited THEN
        RAISE EXCEPTION 'Insufficient points: wallet has %, requested %',
            v_source_balance, p_points_debited
            USING ERRCODE = 'P0001';
    END IF;

    SELECT exchange_rate_id, rate
      INTO v_rate_id, v_rate
      FROM exchange_rates
     WHERE from_program_id = v_source_program_id
       AND to_program_id = v_destination_program_id
       AND active = TRUE
     FOR SHARE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No active exchange rate exists for these programs'
            USING ERRCODE = 'P0001';
    END IF;

    -- Points are whole numbers; round to the nearest whole point.
    v_points_credited := ROUND(p_points_debited::NUMERIC * v_rate)::BIGINT;
    IF v_points_credited <= 0 THEN
        RAISE EXCEPTION 'This amount would credit less than one point'
            USING ERRCODE = '22023';
    END IF;

    SELECT merchant_id INTO v_source_merchant_id
      FROM programs WHERE program_id = v_source_program_id;
    SELECT merchant_id INTO v_destination_merchant_id
      FROM programs WHERE program_id = v_destination_program_id;

    IF v_source_merchant_id = v_destination_merchant_id
       AND p_settlement_amount <> 0 THEN
        RAISE EXCEPTION 'Exchanges between programs of one merchant have no settlement amount'
            USING ERRCODE = '22023';
    ELSIF v_source_merchant_id <> v_destination_merchant_id
       AND p_settlement_amount <= 0 THEN
        RAISE EXCEPTION 'Cross-merchant exchanges need a positive settlement amount'
            USING ERRCODE = '22023';
    END IF;

    -- The API sets this transaction-local value so audit rows identify the customer.
    PERFORM set_config('app.user_id', p_user_id::TEXT, TRUE);

    UPDATE wallets
       SET balance = balance - p_points_debited
     WHERE wallet_id = p_from_wallet_id;

    UPDATE wallets
       SET balance = balance + v_points_credited
     WHERE wallet_id = p_to_wallet_id;

    INSERT INTO transactions (
        user_id,
        from_wallet_id,
        from_program_id,
        to_wallet_id,
        to_program_id,
        exchange_rate_id,
        points_debited,
        points_credited,
        settlement_amount,
        settlement_currency
    ) VALUES (
        p_user_id,
        p_from_wallet_id,
        v_source_program_id,
        p_to_wallet_id,
        v_destination_program_id,
        v_rate_id,
        p_points_debited,
        v_points_credited,
        p_settlement_amount,
        p_settlement_currency
    )
    RETURNING transaction_id INTO v_transaction_id;

    -- Keep one pending settlement total per merchant direction, month, and currency.
    -- Destination merchant owes the source merchant under the agreed demo policy.
    IF v_destination_merchant_id <> v_source_merchant_id THEN
        v_period_start := date_trunc('month', CURRENT_DATE)::DATE;
        v_period_end := (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

        INSERT INTO settlements (
            debtor_merchant_id,
            creditor_merchant_id,
            created_by,
            period_start,
            period_end,
            amount,
            currency
        ) VALUES (
            v_destination_merchant_id,
            v_source_merchant_id,
            p_user_id,
            v_period_start,
            v_period_end,
            p_settlement_amount,
            p_settlement_currency
        )
        ON CONFLICT ON CONSTRAINT settlements_period_direction_currency_uk
        DO UPDATE SET amount = settlements.amount + EXCLUDED.amount
        WHERE settlements.status = 'pending'
        RETURNING settlement_id INTO v_settlement_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'This month settlement has already been finalized'
                USING ERRCODE = 'P0001';
        END IF;
    END IF;

    RETURN v_transaction_id;
END;
$$;

-- Reconcile transactions created before settlement generation was added. This
-- aggregate is idempotent: pending totals are set from transaction history rather
-- than incremented, so reapplying this script cannot double-count old exchanges.
INSERT INTO settlements (
    debtor_merchant_id,
    creditor_merchant_id,
    created_by,
    period_start,
    period_end,
    amount,
    currency
)
SELECT monthly.debtor_merchant_id,
       monthly.creditor_merchant_id,
       monthly.created_by,
       monthly.period_start,
       (monthly.period_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE,
       monthly.amount,
       monthly.currency
FROM (
    SELECT destination.merchant_id AS debtor_merchant_id,
           source.merchant_id AS creditor_merchant_id,
           (ARRAY_AGG(t.user_id ORDER BY t.created_at, t.transaction_id))[1] AS created_by,
           date_trunc('month', t.created_at)::DATE AS period_start,
           SUM(t.settlement_amount)::NUMERIC(14, 2) AS amount,
           t.settlement_currency AS currency
    FROM transactions t
    JOIN programs source ON source.program_id = t.from_program_id
    JOIN programs destination ON destination.program_id = t.to_program_id
    WHERE source.merchant_id <> destination.merchant_id
      AND t.settlement_amount > 0
    GROUP BY destination.merchant_id,
             source.merchant_id,
             date_trunc('month', t.created_at)::DATE,
             t.settlement_currency
) AS monthly
ON CONFLICT ON CONSTRAINT settlements_period_direction_currency_uk
DO UPDATE SET amount = EXCLUDED.amount
WHERE settlements.status = 'pending';

-- Claim a coupon once, while locking it so limited stock cannot be oversold.
CREATE OR REPLACE FUNCTION claim_coupon(
    p_user_id BIGINT,
    p_coupon_id BIGINT
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_coupon_status TEXT;
    v_expires_on DATE;
    v_max_claims BIGINT;
    v_claimed_count BIGINT;
    v_user_coupon_id BIGINT;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM users WHERE user_id = p_user_id AND role = 'customer'
    ) THEN
        RAISE EXCEPTION 'Only a registered customer can claim a coupon'
            USING ERRCODE = '42501';
    END IF;

    SELECT status, expires_on, max_claims, claimed_count
      INTO v_coupon_status, v_expires_on, v_max_claims, v_claimed_count
      FROM coupons
     WHERE coupon_id = p_coupon_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Coupon was not found'
            USING ERRCODE = 'P0001';
    END IF;

    IF EXISTS (
        SELECT 1 FROM user_coupons
        WHERE user_id = p_user_id AND coupon_id = p_coupon_id
    ) THEN
        RAISE EXCEPTION 'You have already claimed this coupon'
            USING ERRCODE = '23505';
    END IF;

    IF v_coupon_status <> 'active' OR v_expires_on < CURRENT_DATE THEN
        RAISE EXCEPTION 'This coupon is inactive or expired'
            USING ERRCODE = 'P0001';
    END IF;

    IF v_max_claims IS NOT NULL AND v_claimed_count >= v_max_claims THEN
        RAISE EXCEPTION 'This coupon has reached its claim limit'
            USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO user_coupons (user_id, coupon_id)
    VALUES (p_user_id, p_coupon_id)
    RETURNING user_coupon_id INTO v_user_coupon_id;

    UPDATE coupons
       SET claimed_count = claimed_count + 1
     WHERE coupon_id = p_coupon_id;

    RETURN v_user_coupon_id;
END;
$$;

-- Redeem only a claimed coupon owned by this customer, and only once.
CREATE OR REPLACE FUNCTION redeem_coupon(
    p_user_id BIGINT,
    p_user_coupon_id BIGINT
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_coupon_id BIGINT;
    v_claim_status TEXT;
    v_coupon_status TEXT;
    v_expires_on DATE;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM users WHERE user_id = p_user_id AND role = 'customer'
    ) THEN
        RAISE EXCEPTION 'Only a registered customer can redeem a coupon'
            USING ERRCODE = '42501';
    END IF;

    SELECT coupon_id, status
      INTO v_coupon_id, v_claim_status
      FROM user_coupons
     WHERE user_coupon_id = p_user_coupon_id AND user_id = p_user_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Claimed coupon was not found for this customer'
            USING ERRCODE = '42501';
    END IF;

    IF v_claim_status <> 'claimed' THEN
        RAISE EXCEPTION 'This coupon has already been redeemed or expired'
            USING ERRCODE = 'P0001';
    END IF;

    SELECT status, expires_on
      INTO v_coupon_status, v_expires_on
      FROM coupons
     WHERE coupon_id = v_coupon_id
     FOR SHARE;

    IF v_coupon_status <> 'active' OR v_expires_on < CURRENT_DATE THEN
        RAISE EXCEPTION 'This coupon is inactive or expired'
            USING ERRCODE = 'P0001';
    END IF;

    UPDATE user_coupons
       SET status = 'redeemed', redeemed_at = CURRENT_TIMESTAMP
     WHERE user_coupon_id = p_user_coupon_id AND user_id = p_user_id
       AND status = 'claimed';

    RETURN p_user_coupon_id;
END;
$$;

COMMIT;
