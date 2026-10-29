# Project Tasks

Status boxes are checked only after the work is committed and reviewed. Phase 1 is the shared design checkpoint. Once both members agree on the design and interfaces, Member A and Member B may proceed with independent tasks in parallel; phase numbers group work but do not require one member to wait for the other. Coordinate on shared interfaces and integration points before implementing them.

## Phase 0 — Repository setup

- [x] Add README, project context, team split, task checklist, and contribution workflow.
- [x] Add `.env.example` and ignore local secrets and generated files.
- [ ] Push the starter repository to GitHub and have Member B clone it.

## Phase 1 — Relational design and finalized split

- [ ] Finalize the table list, ER diagram, keys, constraints, and relational schema.
- [ ] Confirm feature ownership and database/API interfaces together.

## Parallel work guide

After Member B reviews the design and both members agree on the shared database/API contracts, tasks can proceed concurrently:

| Member A can work on | Member B can work on | Coordinate before |
|---|---|---|
| PostgreSQL scripts, functions, triggers, views, indexes, seeds, and customer/exchange features | MongoDB audit setup, app/auth foundation, merchant/admin features, and dashboard | Agreeing table/column names, exchange function inputs/outputs, auth/session shape, audit event fields, and settlement currency/calculation |

Keep changes in each member's assigned folders and separate feature branches. Agree who owns a shared-file change before editing it. Open independent pull requests and review one another's work; a member can continue independent tasks while another task awaits review.

### Member A task sequence

- [ ] Complete and merge the relational design PR, then agree on shared design decisions with Member B.
- [ ] Implement PostgreSQL schema scripts and sample data.
- [ ] Implement database safeguards and the point exchange function.
- [ ] Implement customer wallet and exchange features against the agreed interfaces.
- [ ] Implement customer coupon and history features.

### Member B task sequence

- [ ] Review and agree on the relational design and shared database/API contracts.
- [ ] Implement MongoDB audit model, indexes, and aggregation examples.
- [ ] Implement app foundation, database connections, authentication, and role checks.
- [ ] Implement merchant and admin features against the agreed interfaces.

## Phase 2 — PostgreSQL (Member A)

- [ ] Add create, alter, and reset scripts plus realistic seed data.
- [ ] Add transaction/rollback examples, exchange function, trigger safeguards, views, indexes, and coupon full-text search.
- [ ] Add representative SQL queries and explain the important ones.

## Phase 3 — MongoDB (Member B)

- [ ] Define audit documents, indexes, and sample events.
- [ ] Add one or two admin dashboard aggregation pipelines and explain the MongoDB/PostgreSQL split.

## Phase 4 — App foundation and authentication (Member B)

- [ ] Set up Next.js, Tailwind, environment configuration, and PostgreSQL/MongoDB connections.
- [ ] Add registration/login, bcrypt password hashing, JWT httpOnly cookie handling, and backend role checks.

## Phase 5 — API and pages (shared ownership)

- [ ] Member A: customer wallets, exchange preview/execution, coupon search/claim/redeem, and history.
- [ ] Member B: merchant coupon/redemption/settlement views and admin management, settlement, dashboard, and audit views.
- [ ] Add clear API validation and database error messages; verify all writes are role-protected.

## Phase 6 — Testing and documentation (shared)

- [ ] Record about ten test cases with scenario, input, expected result, and actual result.
- [ ] Complete requirements, data dictionary, architecture, DB implementation, screenshots checklist, conclusion, and final README.

## Phase 7 — Optional deployment

- [ ] Deploy only if the team chooses to do so; document Vercel, Neon, and MongoDB Atlas configuration.

## Phase 8 — Demo and viva preparation

- [ ] Write a short demo script with a section for each member.
- [ ] Prepare ten likely viva questions with plain-language answers.
