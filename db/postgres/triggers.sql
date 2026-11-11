-- Balance safeguards and transaction relationship checks.
-- Apply after schema.sql and alter.sql.

BEGIN;

CREATE TABLE IF NOT EXISTS wallet_balance_audit (
    balance_audit_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    wallet_id BIGINT NOT NULL REFERENCES wallets(wallet_id),
    old_balance BIGINT NOT NULL CHECK (old_balance >= 0),
    new_balance BIGINT NOT NULL CHECK (new_balance >= 0),
    changed_by BIGINT REFERENCES users(user_id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT wallet_balance_audit_changed_ck CHECK (old_balance <> new_balance)
);

CREATE INDEX IF NOT EXISTS wallet_balance_audit_wallet_time_idx
    ON wallet_balance_audit(wallet_id, changed_at DESC);

CREATE OR REPLACE FUNCTION guard_wallet_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.balance < 0 THEN
        RAISE EXCEPTION 'Wallet % cannot have a negative balance', OLD.wallet_id
            USING ERRCODE = '23514';
    END IF;

    IF NEW.balance IS DISTINCT FROM OLD.balance THEN
        NEW.updated_at := CURRENT_TIMESTAMP;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wallets_balance_guard_trg ON wallets;
CREATE TRIGGER wallets_balance_guard_trg
BEFORE UPDATE OF balance ON wallets
FOR EACH ROW
EXECUTE FUNCTION guard_wallet_balance();

CREATE OR REPLACE FUNCTION record_wallet_balance_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_actor_id BIGINT;
    v_old_balance BIGINT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_old_balance := 0;
    ELSE
        v_old_balance := OLD.balance;
    END IF;

    IF NEW.balance IS NOT DISTINCT FROM v_old_balance THEN
        RETURN NEW;
    END IF;

    v_actor_id := NULLIF(current_setting('app.user_id', TRUE), '')::BIGINT;

    INSERT INTO wallet_balance_audit (wallet_id, old_balance, new_balance, changed_by)
    VALUES (NEW.wallet_id, v_old_balance, NEW.balance, v_actor_id);

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wallets_balance_audit_insert_trg ON wallets;
CREATE TRIGGER wallets_balance_audit_insert_trg
AFTER INSERT ON wallets
FOR EACH ROW
EXECUTE FUNCTION record_wallet_balance_change();

DROP TRIGGER IF EXISTS wallets_balance_audit_update_trg ON wallets;
CREATE TRIGGER wallets_balance_audit_update_trg
AFTER UPDATE OF balance ON wallets
FOR EACH ROW
EXECUTE FUNCTION record_wallet_balance_change();

CREATE OR REPLACE FUNCTION validate_exchange_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_source_user_id BIGINT;
    v_source_program_id BIGINT;
    v_destination_user_id BIGINT;
    v_destination_program_id BIGINT;
    v_rate_source_program_id BIGINT;
    v_rate_destination_program_id BIGINT;
    v_rate NUMERIC(18, 6);
BEGIN
    SELECT user_id, program_id
      INTO v_source_user_id, v_source_program_id
      FROM wallets WHERE wallet_id = NEW.from_wallet_id;

    SELECT user_id, program_id
      INTO v_destination_user_id, v_destination_program_id
      FROM wallets WHERE wallet_id = NEW.to_wallet_id;

    IF v_source_user_id <> NEW.user_id OR v_destination_user_id <> NEW.user_id THEN
        RAISE EXCEPTION 'Both wallets must belong to the transaction customer'
            USING ERRCODE = '23514';
    END IF;

    IF v_source_program_id <> NEW.from_program_id
       OR v_destination_program_id <> NEW.to_program_id THEN
        RAISE EXCEPTION 'Wallet programs do not match the transaction programs'
            USING ERRCODE = '23514';
    END IF;

    SELECT from_program_id, to_program_id, rate
      INTO v_rate_source_program_id, v_rate_destination_program_id, v_rate
      FROM exchange_rates
     WHERE exchange_rate_id = NEW.exchange_rate_id;

    IF v_rate_source_program_id <> NEW.from_program_id
       OR v_rate_destination_program_id <> NEW.to_program_id THEN
        RAISE EXCEPTION 'Exchange rate does not match the transaction programs'
            USING ERRCODE = '23514';
    END IF;

    IF NEW.points_credited <> ROUND(NEW.points_debited * v_rate)::BIGINT THEN
        RAISE EXCEPTION 'Credited points do not match the exchange rate'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS transactions_validate_exchange_trg ON transactions;
CREATE TRIGGER transactions_validate_exchange_trg
BEFORE INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION validate_exchange_transaction();

-- Monthly settlement totals stay open while new exchanges can still accrue.
CREATE OR REPLACE FUNCTION guard_settlement_period_close()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.status = 'pending'
       AND NEW.status IN ('paid', 'cancelled')
       AND NEW.period_end >= CURRENT_DATE THEN
        RAISE EXCEPTION 'A monthly settlement can only be paid or cancelled after its period ends'
            USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS settlements_period_close_guard_trg ON settlements;
CREATE TRIGGER settlements_period_close_guard_trg
BEFORE UPDATE OF status ON settlements
FOR EACH ROW
EXECUTE FUNCTION guard_settlement_period_close();

COMMIT;
