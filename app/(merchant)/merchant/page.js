"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

function StatCard({ label, value, description }) {
  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-zinc-900">{value ?? "—"}</p>
      <p className="mt-1 text-sm text-zinc-500">{description}</p>
    </article>
  );
}

export default function MerchantDashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const response = await fetch("/api/merchant/dashboard", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load dashboard");
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
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">Merchant portal</p>
        <h1 className="mt-2 text-3xl font-bold text-zinc-900">Dashboard</h1>
        <p className="mt-2 text-zinc-600">Manage your offers and keep track of customer activity.</p>
      </div>

      {loading && <p className="text-zinc-600">Loading dashboard…</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">{error}</p>}

      {data && (
        <>
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-zinc-900">{data.merchant.business_name}</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Account status: <span className="font-medium capitalize text-emerald-700">{data.merchant.status}</span>
            </p>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total coupons" value={data.coupons?.total_coupons ?? 0} description="Coupons created by you" />
            <StatCard label="Active coupons" value={data.coupons?.active_coupons ?? 0} description="Currently active offers" />
            <StatCard label="Claims" value={data.redemptions?.total_claims ?? 0} description="Customer coupon claims" />
            <StatCard label="Redemptions" value={data.redemptions?.total_redemptions ?? 0} description="Coupons redeemed" />
          </section>

          <section className="mt-8 grid gap-5 md:grid-cols-2">
            <article className="rounded-xl border border-zinc-200 bg-white p-5">
              <h2 className="font-semibold text-zinc-900">Your loyalty programs</h2>
              {data.programs?.length ? (
                <ul className="mt-4 space-y-3">
                  {data.programs.map((program) => (
                    <li key={program.program_id} className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-3 last:border-0">
                      <div>
                        <p className="font-medium text-zinc-800">{program.program_name}</p>
                        <p className="text-sm text-zinc-500">{program.points_name}</p>
                      </div>
                      <span className="text-xs font-medium capitalize text-emerald-700">{program.status}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-3 text-sm text-zinc-500">No programs found.</p>}
            </article>

            <article className="rounded-xl border border-zinc-200 bg-white p-5">
              <h2 className="font-semibold text-zinc-900">Settlement overview</h2>
              {data.settlements?.length ? (
                <ul className="mt-4 space-y-3">
                  {data.settlements.map((item, index) => (
                    <li key={`${item.direction}-${item.currency}-${item.status}-${index}`} className="flex justify-between gap-3 border-b border-zinc-100 pb-3 last:border-0">
                      <span className="text-sm capitalize text-zinc-600">{item.direction} · {item.status}</span>
                      <span className="font-semibold text-zinc-900">{item.currency} {item.total_amount}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-3 text-sm text-zinc-500">No settlement activity yet.</p>}
              <Link href="/merchant/settlements" className="mt-4 inline-block text-sm font-medium text-emerald-800 hover:underline">
                View settlements →
              </Link>
            </article>
          </section>

          <section className="mt-8 flex flex-wrap gap-3">
            <Link href="/merchant/coupons" className="rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800">
              Manage coupons
            </Link>
            <Link href="/merchant/redemptions" className="rounded-lg border border-zinc-300 px-5 py-3 font-semibold text-zinc-700 hover:bg-zinc-50">
              View redemptions
            </Link>
          </section>
        </>
      )}
    </main>
  );
}
