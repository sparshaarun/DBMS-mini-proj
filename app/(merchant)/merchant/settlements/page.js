"use client";

import { useEffect, useState } from "react";

export default function MerchantSettlementsPage() {
  const [data, setData] = useState({ summary: [], settlements: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSettlements() {
      try {
        const response = await fetch("/api/merchant/settlements", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load settlements");
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadSettlements();
  }, []);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">Merchant portal</p>
        <h1 className="mt-2 text-3xl font-bold text-zinc-900">Settlements</h1>
        <p className="mt-2 text-zinc-600">Review amounts owed and amounts receivable from point exchanges.</p>
      </div>

      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
      {loading && <p className="text-zinc-600">Loading settlements…</p>}

      {!loading && (
        <>
          <section className="mb-8 grid gap-4 sm:grid-cols-2">
            {data.summary.map((item, index) => (
              <article key={`${item.direction}-${item.currency}-${item.status}-${index}`} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <p className="text-sm capitalize text-zinc-500">{item.direction} · {item.status}</p>
                <p className="mt-2 text-2xl font-bold text-zinc-900">{item.currency} {item.total_amount}</p>
                <p className="mt-1 text-sm text-zinc-500">{item.settlement_count} settlement(s)</p>
              </article>
            ))}
          </section>

          <h2 className="mb-4 text-xl font-semibold text-zinc-900">Settlement records</h2>
          {data.settlements.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-zinc-600">No settlement records yet. Cross-merchant exchanges will appear here when settlement records are created.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-zinc-50 text-zinc-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Settlement</th>
                    <th className="px-4 py-3 font-semibold">Direction</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Period</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {data.settlements.map((item) => (
                    <tr key={item.settlement_id}>
                      <td className="px-4 py-3 text-zinc-800">#{item.settlement_id}</td>
                      <td className="px-4 py-3 text-zinc-600">
                        {item.debtor_merchant_id === data.merchant?.merchant_id ? "You owe" : "Owed to you"}
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-800">{item.currency} {item.amount}</td>
                      <td className="px-4 py-3 text-zinc-500">{String(item.period_start).slice(0, 10)} – {String(item.period_end).slice(0, 10)}</td>
                      <td className="px-4 py-3 capitalize text-zinc-600">{item.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </main>
  );
}
