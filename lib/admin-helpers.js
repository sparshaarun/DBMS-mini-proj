import { requireRole } from "@/lib/auth-helpers";

export async function requireAdmin() {
  return requireRole(["admin"]);
}

export async function writeAdminAudit(eventType, user, details) {
  try {
    const { getMongoDb } = await import("@/lib/mongodb");
    const db = await getMongoDb();

    await db.collection("audit_logs").insertOne({
      eventType,
      timestamp: new Date(),
      actor: {
        userId: Number(user.user_id),
        role: "admin",
      },
      details,
    });
  } catch (error) {
    console.error("Admin audit logging failed:", error.message);
  }
}
