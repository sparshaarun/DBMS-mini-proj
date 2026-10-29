# Team Split

Team labels from the project brief: **Member A = [Name A]** and **Member B = [Name B]**. Replace the bracketed names before submitting. Both members own database and application work, with separate feature areas to reduce merge conflicts.

## Ownership

| Area | Member A | Member B |
|---|---|---|
| PostgreSQL | `db/postgres/schema.sql`, `alter.sql`, `reset.sql`, trigger and function SQL, views/indexes, seed data, and customer/exchange queries | Review DB interface and contribute documented test/query cases in their owned docs; coordinate before changing A's SQL files |
| MongoDB | Provide event names and payload needs for exchange and redemption | `db/mongo/` setup, audit event model, indexes, and dashboard aggregation pipelines |
| Shared backend foundation | Review API contract and provide exchange function signature | `lib/` connections and auth helpers; shared API foundations under `app/api/` |
| Customer features | Customer and exchange APIs/pages in `app/api/customer/`, `app/api/exchange/`, `app/(customer)/`, plus their customer-specific helpers | Review API contract and auth integration; avoid editing A-owned customer files |
| Merchant and admin features | Supply settlement SQL contract and review it with B | Merchant/admin APIs and pages under `app/api/merchant/`, `app/api/admin/`, `app/(merchant)/`, and `app/(admin)/` |
| Documentation | PostgreSQL implementation details and query explanations | MongoDB, auth, architecture, and merchant/admin implementation details |

Shared configuration (`package.json`, `app/layout.tsx`, global styles, and shared types) can cause conflicts. Agree on changes first; preferably one member owns each shared-file change and the other rebases or merges it.

## Working in parallel

After both members review and agree on `docs/DB_DESIGN.md` and the shared database/API interfaces, neither member needs to wait for the other to finish every phase. Member A can build PostgreSQL and customer/exchange features while Member B builds MongoDB, authentication, and merchant/admin features. Keep those changes in separate feature branches and owned folders. Coordinate before implementing a shared interface or editing shared configuration, then review and merge pull requests independently.

## Git history expectations

Both contributors must make commits under their own Git identity and have their own feature branches and pull requests. Do not share one person's account or commit identity. Each person should make several small, meaningful commits in their assigned areas; review alone does not replace authored commits.

Suggested Member A commits, in order:

1. `docs(db): define relational schema and ER design`
2. `feat(db): add PostgreSQL schema and constraints`
3. `feat(db): add exchange function and balance safeguards`
4. `feat(customer): add wallet and exchange flows`
5. `feat(customer): add coupon and history flows`

Suggested Member B commits, in order:

1. `feat(db): add MongoDB audit model and indexes`
2. `feat(auth): add database connections and role checks`
3. `feat(merchant): add coupon and redemption views`
4. `feat(admin): add settlement and dashboard views`
5. `docs: add test results and viva guide`

Adjust commit titles to match actual changes. Do not make empty commits just to match this list.
