
const dbName = process.env.MONGODB_DB || "coupon_exchange";
const auditCollection = db.getSiblingDB(dbName).audit_logs;

// 1. Count events by type
const eventsByType = auditCollection.aggregate([
  {
    $group: {
      _id: "$eventType",
      totalEvents: { $sum: 1 }
    }
  },
  {
    $sort: { totalEvents: -1 }
  }
]).toArray();

print("Events by Type:");
printjson(eventsByType);


// 2. Count activities by user role
const activitiesByRole = auditCollection.aggregate([
  {
    $group: {
      _id: "$actor.role",
      totalActivities: { $sum: 1 }
    }
  },
  {
    $sort: { totalActivities: -1 }
  }
]).toArray();

print("Activities by Role:");
printjson(activitiesByRole);


// 3. Recent coupon redemptions
const recentRedemptions = auditCollection.aggregate([
  {
    $match: {
      eventType: "coupon_redeemed"
    }
  },
  {
    $sort: { timestamp: -1 }
  },
  {
    $limit: 10
  },
  {
    $project: {
      _id: 0,
      timestamp: 1,
      userId: "$actor.userId",
      couponId: "$details.couponId",
      merchantId: "$details.merchantId"
    }
  }
]).toArray();

print("Recent Coupon Redemptions:");
printjson(recentRedemptions);


// 4. Point exchange activity
const exchangeActivity = auditCollection.aggregate([
  {
    $match: {
      eventType: "points_exchanged"
    }
  },
  {
    $group: {
      _id: null,
      totalExchanges: { $sum: 1 },
      totalPointsDebited: {
        $sum: "$details.pointsDebited"
      },
      totalPointsCredited: {
        $sum: "$details.pointsCredited"
      }
    }
  },
  {
    $project: {
      _id: 0,
      totalExchanges: 1,
      totalPointsDebited: 1,
      totalPointsCredited: 1
    }
  }
]).toArray();

print("Point Exchange Summary:");
printjson(exchangeActivity);
