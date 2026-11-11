"use client";

import { useEffect, useState } from "react";

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadCoupons() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/coupons");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load coupons");
      }

      setCoupons(data.coupons || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCoupons();
  }, []);

  function formatDate(value) {
    if (!value) return "No expiry";
    return new Date(value).toLocaleDateString();
  }

  return (
    <main className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
          Platform administration
        </p>
        <h1 className="mt-2 text-3xl font-bold">Coupon oversight</h1>
        <p className="mt-2 text-gray-600">
          Monitor coupons across all registered merchants.
        </p>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">
            Platform coupons ({coupons.length})
          </h2>
          <button
            onClick={loadCoupons}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading coupons...</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : coupons.length === 0 ? (
          <p className="text-gray-500">No coupons found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="p-3">Coupon</th>
                  <th className="p-3">Merchant</th>
                  <th className="p-3">Program</th>
                  <th className="p-3">Claims</th>
                  <th className="p-3">Redeemed</th>
                  <th className="p-3">Expiry</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon.coupon_id} className="border-t border-gray-100">
                    <td className="p-3">
                      <p className="font-semibold">{coupon.title}</p>
                      <p className="text-xs text-gray-500">
                        {coupon.category || "Uncategorized"}
                      </p>
                    </td>
                    <td className="p-3">{coupon.business_name}</td>
                    <td className="p-3">{coupon.program_name}</td>
                    <td className="p-3">
                      {coupon.total_claim_records} / {coupon.max_claims}
                    </td>
                    <td className="p-3">{coupon.redeemed_count}</td>
                    <td className="p-3">{formatDate(coupon.expires_on)}</td>
                    <td className="p-3">
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium capitalize">
                        {coupon.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
