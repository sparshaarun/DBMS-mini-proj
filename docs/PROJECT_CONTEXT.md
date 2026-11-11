# Project Context

## Idea

Digital Coupon Clearinghouse & Loyalty Points Exchange allows customers to hold points from multiple merchant loyalty programs, exchange points using configured rates, and claim and redeem digital coupons.

The system uses PostgreSQL for relational business data and MongoDB for application audit events.

## Users and roles

- **Customer:** View wallets, preview and exchange points, search and filter coupons, claim and redeem coupons, and review activity.
- **Merchant:** Manage its own coupons, review redemptions, and view settlement information.
- **Admin:** Manage merchants and exchange rates, monitor platform coupons, review audit activity, view dashboard summaries, and pay or cancel closed-period settlements.

Backend route handlers enforce authentication and role permissions.

## Technology choices

- Next.js App Router and Tailwind CSS.
- PostgreSQL with the `pg` library and parameterized SQL.
- MongoDB for audit and activity events.
- bcrypt for password hashing.
- JWT sessions stored in httpOnly cookies.
- Environment variables for database connections and secrets.

## Database architecture

PostgreSQL stores:
- Users and merchant profiles.
- Loyalty programs and wallets.
- Coupons and customer coupon claims.
- Exchange rates and point transactions.
- Merchant settlements.
- Wallet balance audit records.

MongoDB stores application audit events in the `audit_logs` collection.

The MongoDB audit document contains an event type, timestamp, actor information, and event-specific details. Successful logins, point exchanges, coupon redemptions, and administrator changes are recorded as best-effort audit events without passwords or tokens.

See `DB_DESIGN.md` and `MEMBER_B_IMPLEMENTATION.md` for details.

## Application structure

- `app/api/auth/`: Authentication endpoints.
- `app/api/customer/`: Customer endpoints.
- `app/api/merchant/`: Merchant endpoints.
- `app/api/admin/`: Administrator endpoints.
- `app/(auth)/`: Customer registration page; `/` is the sign-in page.
- `app/(merchant)/`: Merchant interface.
- `app/(admin)/`: Administrator interface, including exchange-rate management.
- `lib/`: Database connections, authentication, and shared helpers.
- `db/postgres/`: PostgreSQL scripts.
- `db/mongo/`: MongoDB setup and aggregation examples.
- `docs/`: Project and implementation documentation.

## Conventions

- Use parameterized SQL through `pg`.
- Validate input before database writes.
- Enforce authorization on the backend.
- Keep secrets in environment variables.
- Keep database safeguards in PostgreSQL.
- Use small, meaningful Git commits.
- Coordinate changes to shared files and database interfaces.

## Team ownership

Member A owns PostgreSQL implementation and customer/exchange features.

Member B owns MongoDB audit infrastructure, authentication, shared backend foundations, merchant features, and administrator features.

See `TEAM_SPLIT.md` for details.
