import { query } from "@/lib/postgres";
import { requireRole } from "@/lib/auth-helpers";

export async function requireMerchant() {
  const auth = await requireRole(["merchant"]);

  if (auth.error) return auth;

  const result = await query(
    `SELECT merchant_id, user_id, business_name, status
     FROM merchants
     WHERE user_id = $1`,
    [auth.user.user_id]
  );

  const merchant = result.rows[0];

  if (!merchant || merchant.status !== "active") {
    return {
      user: auth.user,
      merchant: null,
      error: "An active merchant profile is required",
      status: 403,
    };
  }

  return {
    user: auth.user,
    merchant,
    error: null,
    status: 200,
  };
}

export async function writeMerchantAudit(eventType, user, details) {
  try {
    const { getMongoDb } = await import("@/lib/mongodb");
    const db = await getMongoDb();

    await db.collection("audit_logs").insertOne({
      eventType,
      timestamp: new Date(),
      actor: {
        userId: Number(user.user_id),
        role: "merchant",
      },
      details,
    });
  } catch (error) {
    console.error("Merchant audit logging failed:", error.message);
  }
}
