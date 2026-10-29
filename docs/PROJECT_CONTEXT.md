# Project Context

## Idea

Digital Coupon Clearinghouse & Loyalty Points Exchange lets customers hold points from several merchant loyalty programs, exchange points using configured rates, and claim and redeem digital coupons. Administrators manage merchants, programs, rates, and settlement. The system must prevent negative balances and prevent a coupon from being redeemed more than once.

## Users and roles

- **Customer:** view wallets, preview and exchange points, search and filter coupons, claim and redeem coupons, and review activity.
- **Merchant:** manage its own coupons, review redemptions, and view its settlement summary.
- **Admin:** manage merchants and exchange rates, run settlements, and review dashboard metrics and audit activity.

Backend route handlers enforce authentication and role permissions. Hiding a page or button is not an access control check.

## Technology choices

- Next.js App Router, Tailwind CSS, and Route Handlers for the application and API.
- PostgreSQL with the `pg` library and raw SQL for relational data, balances, exchanges, redemptions, and settlement.
- MongoDB for append-only audit and activity events such as login, exchange, and redemption.
- bcrypt for password hashing and JWT stored in an httpOnly cookie for sessions.
- Credentials and secrets come from environment variables; `.env` is local and untracked.

PostgreSQL is used where constraints and atomic transactions protect shared balances and coupon state. MongoDB is used for flexible event documents and audit history.

## Planned relational tables

The initial design targets these nine tables: `users`, `merchants`, `programs`, `wallets`, `coupons`, `user_coupons`, `exchange_rates`, `transactions`, and `settlements`. The finalized ER diagram, keys, constraints, and data dictionary are Phase 1 deliverables.

## Planned MongoDB data

The `audit_logs` collection records relevant events with an event type, timestamp, actor, and safe event details. The exact document shape, indexes, and dashboard aggregation examples will be finalized in Phase 3. Do not put passwords or JWTs in logs.

## Folder structure

```text
app/
  api/                 # Route Handlers
  (auth)/              # Login and registration pages
  (customer)/          # Customer pages
  (merchant)/          # Merchant pages
  (admin)/             # Admin pages
db/
  postgres/            # PostgreSQL schema, functions, seeds, and queries
  mongo/               # MongoDB setup and aggregation examples
docs/                  # Project, team, task, and contribution documents
lib/                   # Database connections, auth, validation, and shared helpers
```

Role-specific page groups and feature folders are assigned in `TEAM_SPLIT.md` to keep parallel work apart.

## Conventions

- Use raw parameterized SQL through `pg`; no ORM.
- Keep route handlers small and validate inputs before database writes.
- Put secrets in environment variables; update `.env.example` when adding a variable.
- Use clear names and short comments that explain non-obvious code.
- Keep database safeguards in PostgreSQL as well as API checks.
- Use small commits with a clear scope, such as `feat(db): add exchange_points function`.
- Coordinate shared interfaces through documentation and review; do not edit another member's owned files without agreement.

## Phase plan

See `TASKS.md` for the staged checklist. Each phase is completed and reviewed before moving to the next one.
