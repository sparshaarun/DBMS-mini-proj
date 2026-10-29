# Relational Database Design

**Owner:** Member A  
**Status:** Proposed design for review before SQL implementation

## Design overview

PostgreSQL stores the data that must remain consistent when two people act at once: account relationships, point balances, exchanges, coupon claims, and settlement records. The initial design has nine tables from the project brief. Although the brief says “around 7–8,” it explicitly names nine entities; keeping each named entity separate avoids mixing unrelated responsibilities.

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

`PK` means primary key, `FK` foreign key, `UK` unique, and `NN` not null. These are design-level definitions; exact SQL is written in Phase 2.

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
| `settlements` | `settlement_id` PK; `debtor_merchant_id`, `creditor_merchant_id` NN FKs → `merchants`; `created_by` NN FK → `users`; `period_start`, `period_end` NN with CHECK start ≤ end; `amount` NN CHECK positive; `currency` NN; `status` NN CHECK in `pending`, `paid`, `cancelled`; `settled_at` nullable and present only when status is `paid`; CHECK debtor differs from creditor. Add a unique key for direction, period, and currency to guard against duplicate settlement runs. |

The transaction amounts preserve the applied rate and settlement amount at exchange time. Later rate changes must not rewrite history. For a cross-merchant exchange, this design convention makes the destination program's merchant the debtor and the source program's merchant the creditor; the amount is the exchange's agreed settlement value in one configured currency. The exact amount calculation and currency policy must be agreed before implementing the stored function.

## Exchange safety flow

1. Begin one PostgreSQL transaction.
2. Lock the customer's source and destination wallet rows in a consistent order.
3. Confirm both wallets belong to the customer, the rate is active and matches those programs, and the source balance is sufficient.
4. Calculate credited points and the settlement amount using the stored rate and the agreed rounding rule.
5. Debit and credit the wallets, then insert one `transactions` row.
6. Commit. If a check or write fails, roll back so neither balance changes alone.

The database CHECK on wallet balance is a final guard against negative values. The stored function and row locks make the multi-row exchange atomic and prevent concurrent spending of the same points.

## Coupon claim and redemption safety

Claiming checks that a coupon is active and not expired, then locks its row, checks remaining claim capacity, inserts the customer's `user_coupons` row, and increments `claimed_count` in one transaction. The unique key on (`user_id`, `coupon_id`) stops duplicate claims. Redemption updates a claimed row to `redeemed` only when its current status is `claimed`; if no row updates, the coupon is already redeemed or invalid. The status CHECK and timestamp CHECK keep the record consistent.

## Design decisions to confirm before Phase 2

- Settlement currency and how the agreed per-exchange settlement value is calculated.
- Whether coupon claiming is limited to one claim per customer (this design says yes) and whether claims consume loyalty points (this design does not charge points).
- Whether merchant profiles are created only by an admin or during merchant registration.
- Which currency codes and rounding rule the mini project will support.

These decisions affect the stored function, validation, seed data, and demo. No SQL implementation should assume a monetary conversion policy until the team agrees on one.
