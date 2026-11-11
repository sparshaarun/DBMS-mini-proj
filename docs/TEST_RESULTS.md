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
| IT-05 | Unauthorized admin API access | Non-admin request is rejected | Pending |
| IT-06 | Finalize an open monthly settlement | API rejects early payment or cancellation with HTTP 409 | Passed through admin API |
| IT-07 | Settlement backfill idempotence | Reapplying `functions.sql` does not double-count and totals match transaction history | Passed against `coupon_exchange_check` |

## Build Verification

The application production build was executed repeatedly using:

    npm run build

The builds completed successfully, including the merchant and administrator routes.

For the settlement change, the admin and customer API routes ran successfully in the local development server. The latest production-build attempt in the restricted Codex environment stopped with an internal Turbopack child-process error while processing `app/globals.css`; it did not report a JavaScript or SQL compilation error. Re-run `npm run build` on the project machine before merging.

## Testing Environment

- Next.js 16.4.4
- PostgreSQL 18
- MongoDB
- Local development environment

The settlement integration checks used isolated PostgreSQL and MongoDB databases named `coupon_exchange_check`. Temporary integration users, historical settlement fixtures, and audit events were removed after verification. The configured `coupon_exchange` PostgreSQL database was not modified.
