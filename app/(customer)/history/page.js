"use client";

import { useEffect, useState } from "react";

export default function CustomerHistoryPage() {
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const response = await fetch("/api/customer/history", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load history");
        setActivities(data.activities);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, []);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">Customer</p>
        <h1 className="mt-2 text-3xl font-bold text-zinc-900">Activity history</h1>
        <p className="mt-2 text-zinc-600">Your recent point exchanges and coupon activity.</p>
        <a href="/wallets" className="mt-4 inline-block text-sm font-medium text-emerald-800 hover:underline">
          Back to wallets
        </a>
      </div>

      {loading && <p className="text-zinc-600">Loading activity…</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">{error}</p>}
      {!loading && !error && activities.length === 0 && (
        <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-zinc-600">
          No activity yet.
        </p>
      )}

      {!loading && !error && activities.length > 0 && (
        <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
          {activities.map((activity) => (
            <article key={`${activity.activity_type}-${activity.activity_id}`} className="flex flex-wrap justify-between gap-3 p-4">
              <div>
                <p className="font-semibold text-zinc-900">{activity.summary}</p>
                <p className="mt-1 text-sm text-zinc-600">{activity.details}</p>
              </div>
              <time className="text-sm text-zinc-500" dateTime={activity.occurred_at}>
                {new Date(activity.occurred_at).toLocaleString()}
              </time>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
