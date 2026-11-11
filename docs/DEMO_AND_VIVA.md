# Demo Script and Viva Preparation

## Before the demo

- Start PostgreSQL and MongoDB; set local connection values and a private JWT secret in `.env`.
- Apply the PostgreSQL scripts in the README order and seed sample data.
- Start the app with `npm run dev` and open `http://localhost:3000`.
- Prepare one customer account, one merchant account, and one admin account. Public registration creates customer accounts; create demo admin/merchant accounts only in the local demo database.
- Ensure a source/destination wallet pair has an active exchange rate and enough points.
- For a settlement payment demonstration, use a closed-period pending settlement. Current-month totals cannot be finalized before month-end.
- Do not show real passwords, JWT values, database passwords, or private MongoDB connection strings in screenshots.

## Suggested 6-minute presentation

### Member A — PostgreSQL and customer flow (about 3 minutes)

1. Explain the ER diagram and why PostgreSQL stores wallets, transactions, claims, and settlements.
2. Sign in as a customer and show the wallet balances.
3. Preview a point exchange; explain that the preview shows the active rate and resulting points before execution.
4. Execute the exchange. Show the updated balances and activity history, then explain that the database function writes both wallet changes, a transaction, and the monthly settlement total atomically.
5. Search for a coupon, claim it, and mark it redeemed. Explain the unique key and row locks that prevent duplicate claims/redemption.
6. If time permits, show `queries.sql` or `rollback_demo.sql` and describe the `ROLLBACK` result.

### Member B — MongoDB, authentication, merchant/admin flows (about 3 minutes)

1. Explain bcrypt password hashes, JWT httpOnly cookies, and backend role checks.
2. Sign in as a merchant; show merchant-owned coupon management, redemptions, and the settlement summary.
3. Sign in as an admin; show the dashboard status bars and audit log.
4. Set or update one directional exchange rate and explain that the reverse direction is a separate rate.
5. Show a closed-period settlement being marked paid or cancelled. Explain that open-month totals are protected from early finalization.
6. Show a MongoDB aggregation or event row and explain why it is an audit/reporting store rather than the balance source of truth.

## Ten likely viva questions

### 1. Why did you use PostgreSQL for wallets and exchanges?

Wallets and exchanges have relationships and require several writes to succeed together. PostgreSQL provides foreign keys, constraints, row locks, and transactions for those operations.

### 2. Why not store balances in MongoDB too?

Keeping one authoritative balance avoids conflicting copies. PostgreSQL is the source of truth for balances and transactions; MongoDB stores audit events.

### 3. How does the application prevent a negative wallet balance?

The balance column has a `CHECK (balance >= 0)`, a trigger rejects negative updates, and `exchange_points()` locks the source wallet and checks its balance before debiting.

### 4. What happens if the exchange inserts a transaction but settlement generation fails?

All exchange writes run in one PostgreSQL transaction. An error rolls back both wallet updates, the transaction, the settlement total, and associated balance-audit rows.

### 5. Why is `exchange_points()` a database function?

It centralizes the critical exchange steps so the wallet locks, validation, balance updates, and transaction insert cannot be accidentally split across separate application calls.

### 6. How do you stop two people claiming the last coupon at the same time?

`claim_coupon()` locks the coupon row before checking the claim limit. The unique key on customer and coupon also prevents the same customer from claiming twice.

### 7. How does coupon full-text search work?

PostgreSQL converts coupon text into a `tsvector`, converts the search text into a `tsquery`, and matches them with `@@`. A GIN index speeds up that search.

### 8. What is stored in a MongoDB audit event?

An event type, timestamp, actor ID/role, and event-specific details. Passwords, JWTs, and connection secrets are never included.

### 9. How are merchant settlements calculated?

Each cross-merchant exchange records its amount and currency. The destination merchant owes the source merchant. PostgreSQL aggregates those amounts by merchant direction, calendar month, and currency; the monthly total can be paid or cancelled after the period closes.

### 10. How does role-based access work?

The login route verifies the bcrypt hash and sets a JWT in an httpOnly cookie. Each protected Route Handler verifies that session and checks the user role before performing the action.
