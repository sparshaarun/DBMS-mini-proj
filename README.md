# Digital Coupon Clearinghouse & Loyalty Points Exchange

A DBMS mini project for exchanging loyalty points across merchant programs and claiming and redeeming digital coupons. The app is designed for a two-person team and demonstrates safe balance updates, coupon redemption, and merchant settlement.

## Technology

- Next.js App Router, React, and Tailwind CSS
- PostgreSQL with `pg` and raw SQL for balances and transactions
- MongoDB for audit and activity events
- bcrypt and JWT in an httpOnly cookie for authentication

## Prerequisites

- Node.js (LTS) and npm
- PostgreSQL
- MongoDB
- Git

## Get started

1. Clone the repository and enter its folder:

   ```bash
   git clone <repository-url>
   cd dbms_proj
   ```

2. Create your local environment file from the example:

   ```bash
   cp .env.example .env
   ```

   On Windows PowerShell, use `Copy-Item .env.example .env`.

3. Fill in `.env` with your local PostgreSQL and MongoDB connection details and a long random JWT secret. Never commit `.env`.

   The agreed demo settlement policy uses INR 0.10 per debited source point. The destination merchant owes the source merchant; exchanges between programs of one merchant have no settlement amount.

4. Create a PostgreSQL database, then apply the SQL files as they are added in Phase 2. For example:

   ```bash
   psql -U postgres -d coupon_exchange -f db/postgres/schema.sql
   psql -U postgres -d coupon_exchange -f db/postgres/alter.sql
   psql -U postgres -d coupon_exchange -f db/postgres/triggers.sql
   psql -U postgres -d coupon_exchange -f db/postgres/functions.sql
   psql -U postgres -d coupon_exchange -f db/postgres/views_indexes.sql
   psql -U postgres -d coupon_exchange -f db/postgres/seed.sql
   psql -U postgres -d coupon_exchange -f db/postgres/queries.sql
   ```

   To demonstrate an exchange that is deliberately undone, run `db/postgres/rollback_demo.sql` after seeding.

5. Install dependencies and start the app after the Next.js application is added in Phase 4:

   ```bash
   npm install
   npm run dev
   ```

   Open <http://localhost:3000>.

Customer routes include `/wallets`, `/exchange`, `/coupons`, and `/history`. Coupon search uses PostgreSQL full-text search; customer claim and redemption actions call the guarded database functions.

The SQL files, application, and MongoDB setup are added in later project phases. Keep credentials only in your local `.env` file.

## Project guide

- [Project context](docs/PROJECT_CONTEXT.md)
- [Team split](docs/TEAM_SPLIT.md)
- [Task checklist](docs/TASKS.md)
- [Contribution and Git workflow](docs/CONTRIBUTING.md)

## Project status

Phase 0 repository setup is in progress. Follow `docs/TASKS.md` as the project advances.
