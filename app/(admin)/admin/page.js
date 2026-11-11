"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

function StatCard({ label, value, description }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-zinc-900">{value ?? "—"}</p>
      <p className="mt-1 text-sm text-zinc-500">{description}</p>
    </section>
  );
}

function StatusBars({ items, emptyMessage }) {
  const maximum = Math.max(1, ...items.map((item) => Number(item.total)));

  if (!items.length) return <p className="mt-4 text-sm text-zinc-500">{emptyMessage}</p>;

  return (
    <div className="mt-4 space-y-4" role="img" aria-label="Counts grouped by status">
      {items.map((item) => {
        const count = Number(item.total);
        return (
          <div key={item.status}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="capitalize text-zinc-700">{item.status}</span>
              <span className="font-semibold text-zinc-900">{count}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-emerald-600"
                style={{ width: `${Math.max(4, (count / maximum) * 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const response = await fetch("/api/admin/dashboard");
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Unable to load dashboard");
        }

        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
          Platform administration
        </p>
        <h1 className="mt-2 text-3xl font-bold text-zinc-900">Admin dashboard</h1>
        <p className="mt-2 text-zinc-600">
          Monitor platform activity, merchants, coupons and settlements.
        </p>
      </div>

      {loading && <p className="mt-8 text-zinc-600">Loading dashboard…</p>}

      {error && (
        <p role="alert" className="mt-8 rounded-lg bg-red-50 p-4 text-red-800">
          {error}
        </p>
      )}

      {data && (
        <div className="mt-8 space-y-8">
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Registered users" value={data.totals.users} description="All platform accounts" />
            <StatCard label="Merchants" value={data.totals.merchants} description="Registered merchant profiles" />
            <StatCard label="Coupons" value={data.totals.coupons} description="Platform-wide coupons" />
            <StatCard label="Point exchanges" value={data.totals.transactions} description="Completed exchange transactions" />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-zinc-900">Merchant overview</h2>
              <StatusBars items={data.merchantsByStatus} emptyMessage="No merchant records yet." />
              <Link href="/admin/merchants" className="mt-4 inline-block text-sm font-semibold text-emerald-700 hover:underline">
                Manage merchants →
              </Link>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-zinc-900">Coupon overview</h2>
              <StatusBars items={data.couponsByStatus} emptyMessage="No coupon records yet." />
              <Link href="/admin/coupons" className="mt-4 inline-block text-sm font-semibold text-emerald-700 hover:underline">
                View all coupons →
              </Link>
            </div>
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-zinc-900">Settlement overview</h2>
            {data.settlements.length ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 text-zinc-600">
                    <tr>
                      <th className="p-3">Status</th>
                      <th className="p-3">Count</th>
                      <th className="p-3">Total amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.settlements.map((item) => (
                      <tr key={item.status} className="border-t border-zinc-100">
                        <td className="p-3 capitalize">{item.status}</td>
                        <td className="p-3">{item.total}</td>
                        <td className="p-3">{item.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-3 text-sm text-zinc-500">No settlement records yet.</p>
            )}
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-zinc-900">Recent platform activity</h2>
            {data.recentEvents.length ? (
              <div className="mt-4 divide-y divide-zinc-100">
                {data.recentEvents.map((event, index) => (
                  <div key={`${event.eventType}-${index}`} className="flex flex-wrap justify-between gap-2 py-3">
                    <div>
                      <p className="font-medium text-zinc-800">{event.eventType?.replaceAll("_", " ")}</p>
                      <p className="text-xs text-zinc-500">
                        {event.actor?.role || "Unknown role"} · User #{event.actor?.userId ?? "—"}
                      </p>
                    </div>
                    <p className="text-sm text-zinc-500">{formatDate(event.timestamp)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-zinc-500">No audit activity recorded yet.</p>
            )}
            <Link href="/admin/audit" className="mt-4 inline-block text-sm font-semibold text-emerald-700 hover:underline">
              View audit activity →
            </Link>
          </section>
        </div>
      )}
    </main>
  );
}
