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
   git clone https://github.com/sparshaarun/DBMS-mini-proj.git
   cd dbms_proj
   ```

2. Create your local environment file from the example:

   ```bash
   cp .env.example .env
   ```

   On Windows PowerShell, use `Copy-Item .env.example .env`.

3. Fill in `.env` with your local PostgreSQL and MongoDB connection details and a long random JWT secret. Never commit `.env`.

   The agreed demo settlement policy uses INR 0.10 per debited source point. The destination merchant owes the source merchant; exchanges between programs of one merchant have no settlement amount.

4. Create a PostgreSQL database, then apply the SQL files in this order. For example:

   ```bash
   psql -U postgres -d coupon_exchange -f db/postgres/schema.sql
   psql -U postgres -d coupon_exchange -f db/postgres/alter.sql
   psql -U postgres -d coupon_exchange -f db/postgres/triggers.sql
   psql -U postgres -d coupon_exchange -f db/postgres/seed.sql
   psql -U postgres -d coupon_exchange -f db/postgres/functions.sql
   psql -U postgres -d coupon_exchange -f db/postgres/views_indexes.sql
   psql -U postgres -d coupon_exchange -f db/postgres/queries.sql
   ```

   To demonstrate an exchange that is deliberately undone, run `db/postgres/rollback_demo.sql` after seeding.

5. Install dependencies and start the application:

   ```bash
   npm ci
   npm run dev
   ```

   Open <http://localhost:3000>.

The app includes `/register`; customer routes `/wallets`, `/exchange`, `/coupons`, and `/history`; merchant routes under `/merchant`; and admin routes under `/admin`, including `/admin/rates`.

For the default local MongoDB settings, run the index setup with MongoDB Shell (change the URI if yours differs):

```bash
mongosh "mongodb://localhost:27017/coupon_exchange" --file db/mongo/indexes.js
```

Coupon search uses PostgreSQL full-text search. Customer claim/redemption and point exchange call guarded database functions. Cross-merchant exchanges update a monthly settlement total atomically with the wallet balances and transaction. Keep credentials only in your local `.env` file.

## Project guide

- [Project context](docs/PROJECT_CONTEXT.md)
- [Team split](docs/TEAM_SPLIT.md)
- [Task checklist](docs/TASKS.md)
- [Contribution and Git workflow](docs/CONTRIBUTING.md)
- [PostgreSQL query explanations](docs/SQL_QUERY_GUIDE.md)
- [Final project report](docs/FINAL_REPORT.md)
- [Demo script and viva questions](docs/DEMO_AND_VIVA.md)
- [Test results](docs/TEST_RESULTS.md)

## Project status

Core database and application features are implemented, and the integration checks are recorded in `docs/TEST_RESULTS.md`. The team is finishing report screenshots and final presentation material. See `docs/TASKS.md` for the checklist.
