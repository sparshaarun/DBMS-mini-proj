# Project Test Results

## Member B — Authentication, Merchant and Admin Testing

| ID | Scenario | Input | Expected result | Actual result |
|---|---|---|---|---|
| TC-01 | User registration | Valid registration details | Account is created successfully | Passed |
| TC-02 | User login | Valid email and password | User is authenticated | Passed |
| TC-03 | Invalid login | Incorrect password | Login is rejected | Passed |
| TC-04 | Duplicate registration | Existing email address | Duplicate account is rejected | Passed |
| TC-05 | Logout | Authenticated session | Session cookie is cleared | Passed |
| TC-06 | Role authorization | Access restricted endpoint with wrong role | Request is rejected | Passed |
| TC-07 | Merchant coupon creation | Valid coupon details | Coupon is created for the merchant | Passed |
| TC-08 | Merchant status management | Admin deactivates and reactivates merchant | Status is updated and reflected on dashboard | Passed |
| TC-09 | Admin audit logs | Retrieve recorded MongoDB events | Events appear with actor and timestamp | Passed |
| TC-10 | Admin settlement management | Retrieve settlement records | Settlement records or empty state are displayed | Passed |

## Additional integration tests

| ID | Scenario | Expected result | Status |
|---|---|---|---|
| IT-01 | Cross-merchant point exchange | Correct balances, transaction, monthly settlement total, customer history, and MongoDB exchange audit event | Passed against `coupon_exchange_check`; temporary test customer and event removed |
| IT-02 | Mark a closed-period settlement as paid | Status becomes paid and `settled_at` is populated | Passed through admin API; temporary fixture removed |
| IT-03 | Cancel a closed-period settlement | Status becomes cancelled and `settled_at` remains null | Passed through admin API; temporary fixture removed |
| IT-04 | Settlement audit logging | Paid and cancelled status changes are recorded in MongoDB | Passed; temporary audit events removed |
| IT-05 | Unauthorized admin API access | Non-admin request is rejected | Passed; non-admin request was rejected |
| IT-06 | Finalize an open monthly settlement | API rejects early payment or cancellation with HTTP 409 | Passed through admin API |
| IT-07 | Settlement backfill idempotence | Reapplying `functions.sql` does not double-count and totals match transaction history | Passed against `coupon_exchange_check` |
| IT-08 | Admin exchange-rate management | Admin can create/update and enable/disable a rate; non-admin is rejected | Passed; admin rate actions succeeded and non-admin access was rejected |
| IT-09 | Successful-login audit event | MongoDB records a `user_login` event without credentials or tokens | Passed; login event verified without credentials or tokens |

## Build Verification

The application production build was executed repeatedly using:

    npm run build

The build completed successfully on the project machine after PR #10, including the merchant and administrator routes. PostgreSQL `ECONNRESET` messages appeared during static generation, but all routes were generated and the build exited successfully.

The current feature branch adds rate management, a registration page, and login audit logging. Re-run `npm run build` after these changes are reviewed and merged.

## Testing Environment

- Next.js 16.4.4
- PostgreSQL 18
- MongoDB
- Local development environment

The settlement integration checks used isolated PostgreSQL and MongoDB databases named `coupon_exchange_check`. Temporary integration users, historical settlement fixtures, and audit events were removed after verification. The configured `coupon_exchange` PostgreSQL database was not modified.

Member B completed the remaining integration checks. All listed integration tests are recorded above; the latest feature-branch production build still needs to be rerun before merge.
