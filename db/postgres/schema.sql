-- Core relational tables for the coupon and loyalty exchange project.
-- Run reset.sql before this file only when you intentionally want a clean database.

BEGIN;

CREATE TABLE users (
    user_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'merchant', 'customer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Email uniqueness is case-insensitive.
CREATE UNIQUE INDEX users_email_lower_uk ON users (LOWER(email));

CREATE TABLE merchants (
    merchant_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(user_id),
    business_name TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE programs (
    program_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    merchant_id BIGINT NOT NULL REFERENCES merchants(merchant_id),
    program_name TEXT NOT NULL,
    points_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    CONSTRAINT programs_merchant_name_uk UNIQUE (merchant_id, program_name),
    CONSTRAINT programs_id_merchant_uk UNIQUE (program_id, merchant_id)
);

CREATE TABLE wallets (
    wallet_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id),
    program_id BIGINT NOT NULL REFERENCES programs(program_id),
    balance BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT wallets_user_program_uk UNIQUE (user_id, program_id),
    CONSTRAINT wallets_id_program_uk UNIQUE (wallet_id, program_id)
);

CREATE TABLE coupons (
    coupon_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    merchant_id BIGINT NOT NULL,
    program_id BIGINT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    max_claims BIGINT CHECK (max_claims IS NULL OR max_claims > 0),
    claimed_count BIGINT NOT NULL DEFAULT 0 CHECK (claimed_count >= 0),
    expires_on DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT coupons_claim_count_ck CHECK (max_claims IS NULL OR claimed_count <= max_claims),
    CONSTRAINT coupons_merchant_program_fk
        FOREIGN KEY (program_id, merchant_id)
        REFERENCES programs(program_id, merchant_id),
    CONSTRAINT coupons_merchant_title_expiry_uk UNIQUE (merchant_id, title, expires_on)
);

CREATE TABLE user_coupons (
    user_coupon_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id),
    coupon_id BIGINT NOT NULL REFERENCES coupons(coupon_id),
    status TEXT NOT NULL DEFAULT 'claimed' CHECK (status IN ('claimed', 'redeemed', 'expired')),
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    redeemed_at TIMESTAMPTZ,
    CONSTRAINT user_coupons_one_claim_uk UNIQUE (user_id, coupon_id),
    CONSTRAINT user_coupons_redemption_time_ck
        CHECK ((status = 'redeemed') = (redeemed_at IS NOT NULL))
);

CREATE TABLE exchange_rates (
    exchange_rate_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    from_program_id BIGINT NOT NULL REFERENCES programs(program_id),
    to_program_id BIGINT NOT NULL REFERENCES programs(program_id),
    rate NUMERIC(18, 6) NOT NULL CHECK (rate > 0),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT exchange_rates_direction_uk UNIQUE (from_program_id, to_program_id),
    CONSTRAINT exchange_rates_different_programs_ck CHECK (from_program_id <> to_program_id)
);

CREATE TABLE transactions (
    transaction_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id),
    from_wallet_id BIGINT NOT NULL,
    from_program_id BIGINT NOT NULL,
    to_wallet_id BIGINT NOT NULL,
    to_program_id BIGINT NOT NULL,
    exchange_rate_id BIGINT NOT NULL REFERENCES exchange_rates(exchange_rate_id),
    points_debited BIGINT NOT NULL CHECK (points_debited > 0),
    points_credited BIGINT NOT NULL CHECK (points_credited > 0),
    -- Settlement policy must be confirmed by both teammates.
    settlement_amount NUMERIC(14, 2) NOT NULL CHECK (settlement_amount >= 0),
    settlement_currency CHAR(3) NOT NULL CHECK (settlement_currency ~ '^[A-Z]{3}$'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT transactions_different_wallets_ck CHECK (from_wallet_id <> to_wallet_id),
    CONSTRAINT transactions_source_wallet_program_fk
        FOREIGN KEY (from_wallet_id, from_program_id)
        REFERENCES wallets(wallet_id, program_id),
    CONSTRAINT transactions_destination_wallet_program_fk
        FOREIGN KEY (to_wallet_id, to_program_id)
        REFERENCES wallets(wallet_id, program_id)
);

CREATE TABLE settlements (
    settlement_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    debtor_merchant_id BIGINT NOT NULL REFERENCES merchants(merchant_id),
    creditor_merchant_id BIGINT NOT NULL REFERENCES merchants(merchant_id),
    created_by BIGINT NOT NULL REFERENCES users(user_id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    currency CHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    settled_at TIMESTAMPTZ,
    CONSTRAINT settlements_different_merchants_ck CHECK (debtor_merchant_id <> creditor_merchant_id),
    CONSTRAINT settlements_period_ck CHECK (period_start <= period_end),
    CONSTRAINT settlements_paid_time_ck CHECK ((status = 'paid') = (settled_at IS NOT NULL)),
    CONSTRAINT settlements_period_direction_currency_uk
        UNIQUE (debtor_merchant_id, creditor_merchant_id, period_start, period_end, currency)
);

-- Common lookup indexes; coupon full-text and dashboard indexes come later.
CREATE INDEX wallets_program_id_idx ON wallets(program_id);
CREATE INDEX coupons_program_status_expiry_idx ON coupons(program_id, status, expires_on);
CREATE INDEX user_coupons_user_status_idx ON user_coupons(user_id, status);
CREATE INDEX transactions_user_created_idx ON transactions(user_id, created_at DESC);
CREATE INDEX transactions_created_idx ON transactions(created_at);

COMMIT;
