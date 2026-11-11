import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin-helpers";

export async function GET(request) {
  const auth = await requireAdmin();

  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get("eventType");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = 20;
    const skip = (page - 1) * limit;

    const filter = eventType ? { eventType } : {};
    const db = await getMongoDb();
    const collection = db.collection("audit_logs");

    const [events, total, eventTypes] = await Promise.all([
      collection.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .project({ _id: 0 })
        .toArray(),
      collection.countDocuments(filter),
      collection.distinct("eventType"),
    ]);

    return NextResponse.json({
      events,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      eventTypes: eventTypes.sort(),
    });
  } catch (error) {
    console.error("Admin audit logs failed:", error.message);
    return NextResponse.json(
      { error: "Unable to load audit logs" },
      { status: 500 }
    );
  }
}
