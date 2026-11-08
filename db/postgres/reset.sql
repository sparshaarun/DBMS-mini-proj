-- WARNING: Removes the project's tables and their data. Use only for an intentional reset.

BEGIN;

DROP TABLE IF EXISTS
    wallet_balance_audit,
    settlements,
    transactions,
    exchange_rates,
    user_coupons,
    coupons,
    wallets,
    programs,
    merchants,
    users
CASCADE;

COMMIT;
