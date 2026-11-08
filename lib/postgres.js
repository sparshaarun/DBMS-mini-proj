import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured");
}

const pool =
  globalThis.postgresPool ||
  new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.postgresPool = pool;
}

export async function query(text, params) {
  return pool.query(text, params);
}

export async function testPostgresConnection() {
  const result = await pool.query("SELECT NOW() AS current_time");
  return result.rows[0];
}

export default pool;
