import { NextResponse } from "next/server";
import { testPostgresConnection } from "@/lib/postgres";
import { testMongoConnection } from "@/lib/mongodb";

export async function GET() {
  const status = {
    postgres: "disconnected",
    mongodb: "disconnected",
  };

  try {
    await testPostgresConnection();
    status.postgres = "connected";
  } catch (error) {
    console.error("PostgreSQL connection failed:", error.message);
  }

  try {
    await testMongoConnection();
    status.mongodb = "connected";
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
  }

  const success =
    status.postgres === "connected" &&
    status.mongodb === "connected";

  return NextResponse.json(
    {
      success,
      databases: status,
    },
    { status: success ? 200 : 503 }
  );
}
