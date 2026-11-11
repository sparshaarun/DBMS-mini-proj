import { NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { getMongoDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin-helpers";

export async function GET() {
  const auth = await requireAdmin();

  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const [
      users,
      merchants,
      coupons,
      transactions,
      settlements,
      recentEvents,
      eventTypes,
    ] = await Promise.all([
      query(`SELECT COUNT(*)::int AS total FROM users`),
      query(`
        SELECT status, COUNT(*)::int AS total
        FROM merchants
        GROUP BY status
      `),
      query(`
        SELECT status, COUNT(*)::int AS total
        FROM coupons
        GROUP BY status
      `),
      query(`SELECT COUNT(*)::int AS total FROM transactions`),
      query(`
        SELECT status, COUNT(*)::int AS total,
               COALESCE(SUM(amount), 0)::numeric(14,2) AS amount
        FROM settlements
        GROUP BY status
      `),
      (async () => {
        const db = await getMongoDb();
        return db.collection("audit_logs")
          .find({})
          .sort({ timestamp: -1 })
          .limit(10)
          .project({ _id: 0 })
          .toArray();
      })(),
      (async () => {
        const db = await getMongoDb();
        return db.collection("audit_logs").aggregate([
          { $group: { _id: "$eventType", total: { $sum: 1 } } },
          { $sort: { total: -1 } },
        ]).toArray();
      })(),
    ]);

    return NextResponse.json({
      totals: {
        users: users.rows[0].total,
        merchants: merchants.rows.reduce((sum, row) => sum + row.total, 0),
        coupons: coupons.rows.reduce((sum, row) => sum + row.total, 0),
        transactions: transactions.rows[0].total,
      },
      merchantsByStatus: merchants.rows,
      couponsByStatus: coupons.rows,
      settlements: settlements.rows,
      recentEvents,
      eventsByType: eventTypes,
    });
  } catch (error) {
    console.error("Admin dashboard failed:", error.message);
    return NextResponse.json(
      { error: "Unable to load admin dashboard" },
      { status: 500 }
    );
  }
}
