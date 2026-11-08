
// MongoDB audit_logs collection indexes

const dbName = process.env.MONGODB_DB || "coupon_exchange";
const auditCollection = db.getSiblingDB(dbName).audit_logs;

// Index for retrieving the latest audit events
auditCollection.createIndex(
  { timestamp: -1 },
  { name: "audit_timestamp_idx" }
);

// Index for filtering events by type and time
auditCollection.createIndex(
  { eventType: 1, timestamp: -1 },
  { name: "audit_event_type_timestamp_idx" }
);

// Index for retrieving activity by user
auditCollection.createIndex(
  { "actor.userId": 1, timestamp: -1 },
  { name: "audit_actor_user_timestamp_idx" }
);

// Index for filtering activity by role
auditCollection.createIndex(
  { "actor.role": 1, timestamp: -1 },
  { name: "audit_actor_role_timestamp_idx" }
);

print("MongoDB audit indexes created successfully.");
