# Relational Database Design

**Owner:** Member A  
**Status:** Design basis merged in PR #1; demo settlement rule agreed by both members

## Design overview

PostgreSQL stores the data that must remain consistent when two people act at once: account relationships, point balances, exchanges, coupon claims, and settlement records. The design has nine core business tables from the project brief. Although the brief says “around 7–8,” it explicitly names nine entities; keeping each named entity separate avoids mixing unrelated responsibilities. PostgreSQL also has one auxiliary `wallet_balance_audit` table so a trigger can retain each wallet balance change.

All identifiers are generated `BIGINT` identity primary keys. Timestamps use `TIMESTAMPTZ`. Point quantities are whole points (`BIGINT`); monetary amounts and exchange rates use `NUMERIC`, never floating point. SQL names are lowercase `snake_case`.

## ER diagram

```mermaid
erDiagram
    USERS ||--o| MERCHANTS : "merchant account"
    USERS ||--o{ WALLETS : owns
    USERS ||--o{ USER_COUPONS : claims
    USERS ||--o{ TRANSACTIONS : initiates
    USERS ||--o{ SETTLEMENTS : administers
    MERCHANTS ||--o{ PROGRAMS : operates
    MERCHANTS ||--o{ COUPONS : offers
    MERCHANTS ||--o{ SETTLEMENTS : "owes or receives"
    PROGRAMS ||--o{ WALLETS : funds
    PROGRAMS ||--o{ COUPONS : issues
    PROGRAMS ||--o{ EXCHANGE_RATES : "source or destination"
    WALLETS ||--o{ TRANSACTIONS : "source or destination"
    WALLETS ||--o{ WALLET_BALANCE_AUDIT : changes
    USERS o|--o{ WALLET_BALANCE_AUDIT : makes
    COUPONS ||--o{ USER_COUPONS : claimed_as
    EXCHANGE_RATES ||--o{ TRANSACTIONS : prices

    USERS {
        bigint user_id PK
        text full_name
        text email UK
        text password_hash
        text role
        timestamptz created_at
    }
    MERCHANTS {
        bigint merchant_id PK
        bigint user_id FK_UK
        text business_name UK
        text status
        timestamptz created_at
    }
    PROGRAMS {
        bigint program_id PK
        bigint merchant_id FK
        text program_name
        text points_name
        text status
    }
    WALLETS {
        bigint wallet_id PK
        bigint user_id FK
        bigint program_id FK
        bigint balance
        timestamptz updated_at
    }
    COUPONS {
        bigint coupon_id PK
        bigint merchant_id FK
        bigint program_id FK
        text title
        text description
        bigint max_claims
        bigint claimed_count
        date expires_on
        text status
    }
    USER_COUPONS {
        bigint user_coupon_id PK
        bigint user_id FK
        bigint coupon_id FK
        text status
        timestamptz claimed_at
        timestamptz redeemed_at
    }
    EXCHANGE_RATES {
        bigint exchange_rate_id PK
        bigint from_program_id FK
        bigint to_program_id FK
        numeric rate
        boolean active
        timestamptz updated_at
    }
    TRANSACTIONS {
        bigint transaction_id PK
        bigint user_id FK
        bigint from_wallet_id FK
        bigint to_wallet_id FK
        bigint exchange_rate_id FK
        bigint points_debited
        bigint points_credited
        numeric settlement_amount
        char settlement_currency
        timestamptz created_at
    }
    WALLET_BALANCE_AUDIT {
        bigint balance_audit_id PK
        bigint wallet_id FK
        bigint old_balance
        bigint new_balance
        bigint changed_by FK
        timestamptz changed_at
    }
    SETTLEMENTS {
        bigint settlement_id PK
        bigint debtor_merchant_id FK
        bigint creditor_merchant_id FK
        bigint created_by FK
        date period_start
        date period_end
        numeric amount
        char currency
        text status
        timestamptz settled_at
    }
```

## Relational schema and safeguards

`PK` means primary key, `FK` foreign key, `UK` unique, and `NN` not null. The core table definitions are implemented in `db/postgres/schema.sql`; `wallet_balance_audit` is created by `triggers.sql`.

| Table | Columns and constraints |
|---|---|
| `users` | `user_id` PK; `full_name` NN; `email` NN UK (case-insensitive comparison will be enforced with a unique index); `password_hash` NN; `role` NN CHECK in `admin`, `merchant`, `customer`; `created_at` NN default current time. Store only a bcrypt hash. |
| `merchants` | `merchant_id` PK; `user_id` NN FK → `users`, UK (one merchant profile per login); `business_name` NN UK; `status` NN CHECK in `active`, `inactive`; `created_at` NN default current time. The linked user must have the merchant role; enforce this in the API and, if practical, with a trigger. |
| `programs` | `program_id` PK; `merchant_id` NN FK → `merchants`; `program_name` NN; `points_name` NN; `status` NN CHECK in `active`, `inactive`; UK (`merchant_id`, `program_name`). |
| `wallets` | `wallet_id` PK; `user_id` NN FK → `users`; `program_id` NN FK → `programs`; `balance` NN default 0 CHECK `balance >= 0`; `updated_at` NN default current time; UK (`user_id`, `program_id`). |
| `coupons` | `coupon_id` PK; `merchant_id` and `program_id` NN FKs; `title` NN; `description` NN; `max_claims` nullable and CHECK positive when supplied; `claimed_count` NN default 0 CHECK nonnegative and no more than `max_claims` when capped; `expires_on` NN; `status` NN CHECK in `active`, `inactive`; CHECK expiry is not before creation is omitted unless a `created_at` column is added. Merchant and program must match (enforce in API or add a composite FK in SQL). |
| `user_coupons` | `user_coupon_id` PK; `user_id` NN FK → `users`; `coupon_id` NN FK → `coupons`; `status` NN CHECK in `claimed`, `redeemed`, `expired`; `claimed_at` NN default current time; `redeemed_at` nullable; CHECK (`status = 'redeemed'` exactly when `redeemed_at` is not null); UK (`user_id`, `coupon_id`) so one customer cannot claim the same coupon more than once. |
| `exchange_rates` | `exchange_rate_id` PK; `from_program_id`, `to_program_id` NN FKs → `programs`; `rate` NN CHECK `rate > 0`; `active` NN default true; `updated_at` NN default current time; UK (`from_program_id`, `to_program_id`); CHECK source and destination differ. A rate means credited destination points per one debited source point. |
| `transactions` | `transaction_id` PK; `user_id`, `from_wallet_id`, `to_wallet_id`, `exchange_rate_id` NN FKs; `points_debited` NN CHECK positive; `points_credited` NN CHECK positive; `settlement_amount` NN CHECK nonnegative; `settlement_currency` NN; `created_at` NN default current time. A trigger verifies both wallets belong to `user_id` and the rate's programs match the wallet programs. One row records a completed exchange; never insert it before the atomic balance update succeeds. |
| `wallet_balance_audit` | `balance_audit_id` PK; `wallet_id` NN FK → `wallets`; `old_balance`, `new_balance` NN CHECK nonnegative and different; `changed_by` nullable FK → `users`; `changed_at` NN default current time. An after-insert/update trigger records opening balances and each actual balance change. |
| `settlements` | `settlement_id` PK; `debtor_merchant_id`, `creditor_merchant_id` NN FKs → `merchants`; `created_by` NN FK → `users` (customer whose exchange first created the monthly aggregate); `period_start`, `period_end` NN with CHECK start ≤ end; `amount` NN CHECK positive; `currency` NN; `status` NN CHECK in `pending`, `paid`, `cancelled`; `settled_at` nullable and present only when status is `paid`; CHECK debtor differs from creditor. UK (debtor, creditor, period start, period end, currency) ensures one monthly aggregate per direction and currency. |

The transaction amounts preserve the applied rate and settlement amount at exchange time. Later rate changes must not rewrite history. For a cross-merchant exchange, the destination program's merchant is the debtor and the source program's merchant is the creditor. The agreed simple demo rule is INR 0.10 per debited source point; same-merchant exchanges have no settlement amount.

## Exchange safety flow

1. Begin one PostgreSQL transaction.
2. Lock the customer's source and destination wallet rows in a consistent order.
3. Confirm both wallets belong to the customer, the rate is active and matches those programs, and the source balance is sufficient.
4. Calculate credited points using the stored rate and round to the nearest whole point. Trusted server logic supplies the settlement amount and currency.
5. Debit and credit the wallets, insert one `transactions` row, then add the amount to the pending settlement for that debtor, creditor, calendar month, and currency. A unique-key upsert serializes concurrent exchanges into the same aggregate.
6. Commit. If any check or write fails, roll back both wallet changes, the transaction, and the settlement update together.

The database CHECK and wallet trigger guard against negative values. The stored function locks both wallets in ID order, makes both balance updates, transaction insert, and settlement upsert in one statement transaction, and records wallet balance changes in `wallet_balance_audit`. If an exception occurs, PostgreSQL rolls back all of those writes together.

`db/postgres/rollback_demo.sql` wraps a sample exchange in `BEGIN` and `ROLLBACK`. It demonstrates that both balances, the transaction row, the monthly settlement total, and the corresponding audit rows are undone together. `functions.sql` also backfills historical cross-merchant transactions into monthly pending totals when applied; rerunning the script recomputes pending totals from transaction history without double-counting.

Monthly totals remain pending during their month. A database trigger rejects paid or cancelled status changes until `period_end` is before the current date, so active monthly totals cannot be finalized while new exchanges may still accrue. Merchant and admin views read the aggregate rows; admin status actions should report this database rejection as a conflict.

## Coupon claim and redemption safety

`claim_coupon()` checks customer role, active status, expiry, claim capacity, and duplicate ownership while holding a lock on the coupon row. It inserts the claim and increments `claimed_count` in one statement transaction. The unique key on (`user_id`, `coupon_id`) is a second guard against duplicate claims. `redeem_coupon()` locks the customer's claim row and changes it only from `claimed` to `redeemed`; the status CHECK and timestamp CHECK keep the record consistent. A repeated redemption is rejected.

## Other project decisions

- Coupon claiming is limited to one claim per customer and does not consume loyalty points.
- Merchant profile creation is handled by the agreed application flow.
- Exchanges round credited points to the nearest whole point.

The demo uses nearest-whole-point rounding and INR 0.10 per debited source point. The API reads the amount and currency settings from the server environment, never from the browser. This policy is for the mini-project demo.

## Views, indexes, and query examples

`views_indexes.sql` defines customer wallet balances, coupon redemption summaries, and merchant settlement summaries. It adds indexes for transaction history, settlement lookups, and PostgreSQL full-text coupon search. `queries.sql` demonstrates INSERT, UPDATE, DELETE (inside a rollback block), SELECT, JOIN, GROUP BY, HAVING, ORDER BY, aggregates, a `NOT EXISTS` subquery, coupon search, and balance audit history. See `docs/SQL_QUERY_GUIDE.md` for plain-language explanations of each example.
