# Project Tasks

Status boxes are checked only after the work is committed and reviewed. Complete the phases in order; the user will signal when to continue to the next phase.

## Phase 0 — Repository setup

- [x] Add README, project context, team split, task checklist, and contribution workflow.
- [x] Add `.env.example` and ignore local secrets and generated files.
- [ ] Push the starter repository to GitHub and have Member B clone it.

## Phase 1 — Relational design and finalized split

- [ ] Finalize the table list, ER diagram, keys, constraints, and relational schema.
- [ ] Confirm feature ownership and database/API interfaces together.

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
