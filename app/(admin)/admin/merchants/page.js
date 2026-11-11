"use client";

import { useEffect, useState } from "react";

export default function AdminMerchantsPage() {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadMerchants() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/merchants");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load merchants");
      }

      setMerchants(data.merchants || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMerchants();
  }, []);

  async function updateStatus(merchant) {
    const nextStatus = merchant.status === "active" ? "inactive" : "active";

    if (!window.confirm(
      `Are you sure you want to ${nextStatus === "active" ? "activate" : "deactivate"} ${merchant.business_name}?`
    )) {
      return;
    }

    setUpdatingId(merchant.merchant_id);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/merchants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId: merchant.merchant_id,
          status: nextStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to update merchant");
      }

      setMerchants((current) =>
        current.map((item) =>
          item.merchant_id === merchant.merchant_id
            ? { ...item, status: data.merchant.status }
            : item
        )
      );

      setMessage(`${merchant.business_name} is now ${nextStatus}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
      <h1 className="text-3xl font-bold text-zinc-900">Merchant management</h1>
      <p className="mt-2 text-zinc-600">
        Review registered businesses and manage their platform access.
      </p>

      {error && (
        <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {message && (
        <p role="status" className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          {message}
        </p>
      )}

      <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-zinc-900">
            Registered merchants ({merchants.length})
          </h2>
          <button
            onClick={loadMerchants}
            disabled={loading}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {loading && <p className="mt-5 text-sm text-zinc-500">Loading merchants…</p>}

        {!loading && merchants.length === 0 && !error && (
          <p className="mt-5 rounded-lg border border-dashed border-zinc-300 p-6 text-sm text-zinc-500">
            No merchant accounts found.
          </p>
        )}

        {!loading && merchants.length > 0 && (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="p-3">Business</th>
                  <th className="p-3">Account</th>
                  <th className="p-3">Programs</th>
                  <th className="p-3">Coupons</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {merchants.map((merchant) => (
                  <tr key={merchant.merchant_id} className="border-t border-zinc-100">
                    <td className="p-3">
                      <p className="font-semibold text-zinc-900">{merchant.business_name}</p>
                      <p className="text-xs text-zinc-500">Merchant #{merchant.merchant_id}</p>
                    </td>
                    <td className="p-3">
                      <p className="text-zinc-800">{merchant.full_name}</p>
                      <p className="text-xs text-zinc-500">{merchant.email}</p>
                    </td>
                    <td className="p-3 text-zinc-700">{merchant.program_count}</td>
                    <td className="p-3 text-zinc-700">{merchant.coupon_count}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                        merchant.status === "active"
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-zinc-100 text-zinc-600"
                      }`}>
                        {merchant.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => updateStatus(merchant)}
                        disabled={updatingId === merchant.merchant_id}
                        className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                      >
                        {updatingId === merchant.merchant_id
                          ? "Updating…"
                          : merchant.status === "active"
                            ? "Deactivate"
                            : "Activate"}
                      </button>
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
