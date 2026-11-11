
# MongoDB Audit System

## Overview

MongoDB is used to store audit and activity events for the Digital Coupon Clearinghouse & Loyalty Points Exchange project.

The collection used is `audit_logs`.

## Database Configuration

- Database: `coupon_exchange`
- Collection: `audit_logs`
- Environment variable: `MONGODB_URI`
- Database environment variable: `MONGODB_DB`

## Audit Document Structure

Each audit document contains:

- `eventType`: Type of activity performed.
- `timestamp`: Date and time of the event.
- `actor`: Information about the user performing the activity.
- `actor.userId`: PostgreSQL user ID.
- `actor.role`: Role of the user.
- `details`: Event-specific information.

## Supported Events

The audit infrastructure supports event documents with a flexible `eventType` field.

The sample events demonstrate:

1. user_login
2. coupon_created
3. coupon_updated
4. coupon_redeemed
5. points_exchanged
6. settlement_created

The current application records:

1. user_login (successful login only)
2. points_exchanged
3. coupon_redeemed
4. merchant_status_updated
5. coupon_created and coupon_updated
6. settlement_status_updated
7. exchange_rate_updated and exchange_rate_status_updated

Audit writes are best effort. A MongoDB outage does not undo a successful PostgreSQL business transaction or block login.

## Indexes

The following indexes are created:

- `audit_timestamp_idx`
- `audit_event_type_timestamp_idx`
- `audit_actor_user_timestamp_idx`
- `audit_actor_role_timestamp_idx`

These indexes improve filtering and sorting performance.

## Aggregation Pipelines

The project includes four aggregation pipelines:

1. Events grouped by event type.
2. Activities grouped by user role.
3. Recent coupon redemption activity.
4. Point exchange summary.

These pipelines support administrative dashboard analytics.

## Execution

Run the index script using MongoDB Shell:

```bash
mongosh "YOUR_MONGODB_URI" --file db/mongo/indexes.js
```

Run the aggregation pipelines:

```bash
mongosh "YOUR_MONGODB_URI" --file db/mongo/aggregations.js
```

Sample audit events are provided in `sample_events.json`.
