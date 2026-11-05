import { query } from "@/lib/postgres";
import { getAuthToken, verifyToken } from "@/lib/auth";

export async function getCurrentUser() {
  try {
    const token = await getAuthToken();

    if (!token) {
      return null;
    }

    const payload = verifyToken(token);

    const result = await query(
      `SELECT user_id, full_name, email, role, created_at
       FROM users
       WHERE user_id = $1`,
      [payload.userId]
    );

    return result.rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      user: null,
      error: "Authentication required",
      status: 401,
    };
  }

  return { user, error: null, status: 200 };
}

export async function requireRole(allowedRoles) {
  const auth = await requireAuth();

  if (auth.error) {
    return auth;
  }

  if (!allowedRoles.includes(auth.user.role)) {
    return {
      user: null,
      error: "You do not have permission to access this resource",
      status: 403,
    };
  }

  return auth;
}
