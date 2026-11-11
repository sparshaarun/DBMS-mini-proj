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

## Additional integration tests pending

| ID | Scenario | Expected result | Status |
|---|---|---|---|
| IT-01 | Cross-merchant point exchange | Correct balances and settlement record are created | Pending |
| IT-02 | Mark pending settlement as paid | Status becomes paid and settled_at is populated | Pending |
| IT-03 | Cancel pending settlement | Status becomes cancelled and settled_at remains null | Pending |
| IT-04 | Settlement audit logging | Status change is recorded in MongoDB | Pending |
| IT-05 | Unauthorized admin API access | Non-admin request is rejected | Pending |

## Build Verification

The application production build was executed repeatedly using:

    npm run build

The builds completed successfully, including the merchant and administrator routes.

## Testing Environment

- Next.js 16.4.4
- PostgreSQL 18
- MongoDB
- Local development environment
