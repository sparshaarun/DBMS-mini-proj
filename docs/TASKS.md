# Project Tasks

Status boxes are checked only after the work is committed and reviewed. Phase 1 is the shared design checkpoint. Once both members agree on the design and interfaces, Member A and Member B may proceed with independent tasks in parallel; phase numbers group work but do not require one member to wait for the other. Coordinate on shared interfaces and integration points before implementing them.

## Phase 0 — Repository setup

- [x] Add README, project context, team split, task checklist, and contribution workflow.
- [x] Add `.env.example` and ignore local secrets and generated files.
- [x] Push the starter repository to GitHub and have Member B clone it.

## Phase 1 — Relational design and finalized split

- [x] Finalize the table list, ER diagram, keys, constraints, and relational schema.
- [x] Confirm feature ownership and database/API interfaces together.

## Parallel work guide

After Member B reviews the design and both members agree on the shared database/API contracts, tasks can proceed concurrently:

| Member A can work on | Member B can work on | Coordinate before |
|---|---|---|
| PostgreSQL scripts, functions, triggers, views, indexes, seeds, and customer/exchange features | MongoDB audit setup, app/auth foundation, merchant/admin features, and dashboard | Agreeing table/column names, exchange function inputs/outputs, auth/session shape, audit event fields, and settlement currency/calculation |

Keep changes in each member's assigned folders and separate feature branches. Agree who owns a shared-file change before editing it. Open independent pull requests and review one another's work; a member can continue independent tasks while another task awaits review.

### Member A task sequence

- [x] Complete and merge the relational design PR, then agree on shared design decisions with Member B.
- [x] Implement PostgreSQL schema scripts and sample data.
- [x] Implement database safeguards and the point exchange function.
- [x] Implement customer wallet and exchange features against the agreed interfaces.
- [x] Implement customer coupon and history features.

### Member B task sequence

- [x] Review and agree on the relational design and shared database/API contracts.
- [x] Implement MongoDB audit model, indexes, and aggregation examples.
- [x] Implement app foundation, database connections, authentication, and role checks.
- [x] Implement merchant and admin features against the agreed interfaces.
- [ ] Add the admin exchange-rate management page and audit event (implemented on the current feature branch; awaiting review/merge).

## Phase 2 — PostgreSQL (Member A)

- [x] Add create, alter, and reset scripts plus realistic seed data; apply them successfully to a clean local PostgreSQL test database.
- [x] Add transaction/rollback examples, exchange function, trigger safeguards, views, indexes, and coupon full-text search.
- [ ] Add representative SQL queries and explain the important ones (query guide is on the current feature branch; awaiting review/merge).

## Phase 3 — MongoDB (Member B)

- [x] Define audit documents, indexes, and sample events.
- [x] Add one or two admin dashboard aggregation pipelines and explain the MongoDB/PostgreSQL split.

## Phase 4 — App foundation and authentication (Member B)

- [x] Set up Next.js, Tailwind, environment configuration, and PostgreSQL/MongoDB connections.
- [x] Add registration/login APIs, bcrypt password hashing, JWT httpOnly cookie handling, and backend role checks.
- [ ] Add the customer registration page and successful-login MongoDB audit event (implemented on the current feature branch; awaiting review/merge).

## Phase 5 — API and pages (shared ownership)

- [x] Member A: customer wallets, exchange preview/execution, coupon search/claim/redeem, and history.
- [x] Member B: merchant coupon/redemption/settlement views and admin merchant, settlement, dashboard, and audit views.
- [x] Add clear API validation and database error messages; protect writes with backend role checks.
- [ ] Finish the admin rates page and its read/write APIs (implemented on the current feature branch; awaiting review/merge).

## Phase 6 — Testing and documentation (shared)

- [x] Record about ten test cases with scenario, input, expected result, and actual result.
- [ ] Complete requirements, data dictionary, architecture, DB implementation, screenshots checklist, conclusion, and final README (report draft is on the current feature branch; real screenshots and final review remain).
- [x] Complete Member B's integration-test pass and record the results in `docs/TEST_RESULTS.md`.

## Phase 7 — Optional deployment

- [ ] Deploy only if the team chooses to do so; document Vercel, Neon, and MongoDB Atlas configuration.

## Phase 8 — Demo and viva preparation

- [ ] Write a short demo script with a section for each member (draft is on the current feature branch; review together).
- [ ] Prepare ten likely viva questions with plain-language answers (draft is on the current feature branch; review together).
