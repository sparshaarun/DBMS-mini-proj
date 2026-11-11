# Member B — Application and Backend Implementation

## 1. Overview

Member B is responsible for MongoDB audit infrastructure, application backend foundations, authentication, merchant functionality, and administrator functionality.

The implementation uses Next.js App Router, PostgreSQL, MongoDB, bcrypt, and JWT-based authentication.

## 2. MongoDB Audit Infrastructure

MongoDB is used for application activity and audit events, while PostgreSQL remains the source of truth for relational business data.

Database: `coupon_exchange`

Collection: `audit_logs`

Audit documents contain:

- `eventType`: identifies the recorded event.
- `timestamp`: date and time of the event.
- `actor`: identifies the user and their role.
- `details`: event-specific information.

Example document:

    {
      "eventType": "merchant_status_updated",
      "timestamp": "2026-11-11T...",
      "actor": {
        "userId": 6,
        "role": "admin"
      },
      "details": {
        "merchantId": 4,
        "status": "inactive"
      }
    }

MongoDB indexes support audit event lookup and chronological retrieval.

Aggregation examples group audit events by event type and summarize platform activity.

The application records successful logins, point exchanges, coupon redemptions, merchant-status changes, merchant coupon updates, exchange-rate changes, and settlement-status changes. Audit failures are logged without exposing sensitive credentials and do not undo successful PostgreSQL operations.

Passwords and JWTs must never be stored in audit documents.

## 3. Application Foundation and Authentication

Shared backend modules:

- `lib/postgres.js`: PostgreSQL connection and query helper.
- `lib/mongodb.js`: MongoDB connection.
- `lib/auth.js`: authentication and JWT functionality.
- `lib/auth-helpers.js`: current-user and role authorization helpers.

Authentication features:

- User registration.
- Customer registration page at `/register` and sign-in page at `/`.
- Password hashing using bcrypt.
- Login and logout.
- JWT session handling through an httpOnly cookie.
- Current-user retrieval.
- Backend role-based authorization.

Protected API routes validate the user's authentication and role before performing operations.

The application uses three roles:

- Customer
- Merchant
- Admin

## 4. Merchant Features

Merchant pages are located under `app/(merchant)/`.

Implemented pages:

- Merchant dashboard.
- Coupon management.
- Redemption history.
- Settlement overview.

Merchant APIs are located under `app/api/merchant/`.

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/merchant/dashboard` | GET | Merchant dashboard metrics |
| `/api/merchant/coupons` | GET | Retrieve merchant coupons and programs |
| `/api/merchant/coupons` | POST | Create a coupon |
| `/api/merchant/coupons/[id]` | PATCH | Update an existing coupon |
| `/api/merchant/redemptions` | GET | View coupon redemptions |
| `/api/merchant/settlements` | GET | View merchant settlement records |

Merchant authorization ensures that merchants can manage their own business data rather than another merchant's records.

## 5. Administrator Features

Administrator pages are located under `app/(admin)/`.

Implemented pages:

- `/admin`: platform dashboard.
- `/admin/merchants`: merchant management.
- `/admin/rates`: create, update, enable, or disable exchange rates.
- `/admin/coupons`: platform-wide coupon oversight.
- `/admin/audit`: MongoDB audit activity.
- `/admin/settlements`: settlement management.

Administrator APIs:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/admin/dashboard` | GET | Platform metrics and recent audit activity |
| `/api/admin/merchants` | GET | List registered merchants |
| `/api/admin/merchants` | PATCH | Activate or deactivate a merchant |
| `/api/admin/rates` | GET | List active programs and configured rates |
| `/api/admin/rates` | POST | Create or update a directional program rate |
| `/api/admin/rates` | PATCH | Enable or disable a rate |
| `/api/admin/coupons` | GET | View platform-wide coupons |
| `/api/admin/audit` | GET | Retrieve and filter audit events |
| `/api/admin/settlements` | GET | Retrieve settlement records |
| `/api/admin/settlements` | PATCH | Mark a pending settlement paid or cancelled |

All administrator APIs use backend role checks.

Settlement status updates are restricted to pending records. A paid settlement receives a settlement timestamp, while a cancelled settlement has no settlement timestamp.

Settlement totals are grouped by debtor, creditor, calendar month, and currency. Admin status actions are allowed only after the period ends. Administrator changes are recorded in MongoDB audit logs. The dashboard shows merchant and coupon status as simple horizontal bar charts.

## 6. Testing Performed

The following checks have been performed during local development:

| Feature | Test performed | Result |
|---|---|---|
| Registration | Register a new account | Passed |
| Login | Valid credentials | Passed |
| Login | Invalid credentials | Passed |
| Registration | Duplicate account | Passed |
| Authentication | Logout | Passed |
| Authorization | Role-restricted API access | Passed, including the final non-admin admin-API rejection check |
| Merchant dashboard | Load merchant metrics | Passed |
| Merchant coupons | Create and update coupon | Passed |
| Merchant redemptions | Load redemption page | Passed |
| Merchant settlements | Load settlement page | Passed |
| Admin dashboard | Load platform metrics | Passed |
| Admin merchants | List merchants | Passed |
| Admin merchants | Deactivate and reactivate merchant | Passed |
| Admin coupons | Load platform-wide coupon list | Passed |
| Admin audit | Retrieve and filter audit events | Passed |
| Admin exchange rates | Create/update and enable/disable rates | Passed; admin actions succeeded and non-admin access was rejected |
| Admin settlements | Load settlement records and update closed periods | Passed in the settlement integration check |
| Production build | Run `npm run build` | Passed on the project machine after PR #10 |

Member B completed the final non-admin authorization and combined integration checks. Detailed results are recorded in [`TEST_RESULTS.md`](TEST_RESULTS.md).

## 7. Security and Configuration

Configuration is supplied through environment variables.

The local `.env` file must not be committed.

The `.env.example` file documents the required configuration without containing real secrets.

The application uses:

- Parameterized PostgreSQL queries.
- bcrypt password hashing.
- httpOnly JWT cookies.
- Backend role authorization.
- MongoDB audit records without credentials or tokens.

## 8. Implementation Boundaries

Member B owns the MongoDB infrastructure, shared authentication and connection helpers, merchant features, and administrator features.

PostgreSQL schema design, database functions, triggers, views, indexes, and customer/exchange features are coordinated with Member A.

See `TEAM_SPLIT.md` for the complete ownership agreement.
