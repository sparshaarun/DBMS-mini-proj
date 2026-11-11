"use client";

import { useCallback, useEffect, useState } from "react";

export default function MerchantRedemptionsPage() {
  const [redemptions, setRedemptions] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRedemptions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      const response = await fetch(`/api/merchant/redemptions${params.size ? `?${params}` : ""}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load redemptions");
      setRedemptions(data.redemptions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { loadRedemptions(); }, [loadRedemptions]);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">Merchant portal</p>
        <h1 className="mt-2 text-3xl font-bold text-zinc-900">Redemptions</h1>
        <p className="mt-2 text-zinc-600">Review customer claims and redeemed coupons for your business.</p>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">Customer activity</h2>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="claimed">Claimed</option>
          <option value="redeemed">Redeemed</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
      {loading && <p className="text-zinc-600">Loading redemptions…</p>}
      {!loading && !error && redemptions.length === 0 && <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-zinc-600">No redemption activity found.</p>}

      {!loading && redemptions.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Coupon</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Claimed</th>
                <th className="px-4 py-3 font-semibold">Redeemed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {redemptions.map((item) => (
                <tr key={item.user_coupon_id}>
                  <td className="px-4 py-3 text-zinc-800">{item.full_name || item.email || `Customer #${item.user_id}`}</td>
                  <td className="px-4 py-3 font-medium text-zinc-800">{item.title}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium capitalize text-emerald-800">{item.status}</span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{item.claimed_at ? new Date(item.claimed_at).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3 text-zinc-500">{item.redeemed_at ? new Date(item.redeemed_at).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
