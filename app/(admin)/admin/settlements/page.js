"use client";

import { useEffect, useState } from "react";

export default function AdminSettlementsPage() {
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(null);

  async function loadSettlements() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/settlements");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load settlements");
      }

      setSettlements(data.settlements || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettlements();
  }, []);

  async function updateStatus(settlementId, status) {
    const action = status === "paid" ? "mark as paid" : "cancel";

    if (!window.confirm(`Are you sure you want to ${action} this settlement?`)) {
      return;
    }

    setUpdating(settlementId);
    setError("");

    try {
      const response = await fetch("/api/admin/settlements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settlementId, status }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to update settlement");
      }

      await loadSettlements();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(null);
    }
  }

  function formatDate(value) {
    if (!value) return "—";
    return new Date(value).toLocaleDateString();
  }

  function formatAmount(amount, currency) {
    return `${currency} ${Number(amount).toFixed(2)}`;
  }

  const pendingCount = settlements.filter(
    (item) => item.status === "pending"
  ).length;

  const paidCount = settlements.filter(
    (item) => item.status === "paid"
  ).length;

  const pendingAmount = settlements
    .filter((item) => item.status === "pending")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  return (
    <main className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
          Platform administration
        </p>
        <h1 className="mt-2 text-3xl font-bold">Settlement management</h1>
        <p className="mt-2 text-gray-600">
          Monitor and manage payment obligations between merchants.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Pending settlements</p>
          <p className="mt-2 text-3xl font-bold">{pendingCount}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Completed settlements</p>
          <p className="mt-2 text-3xl font-bold">{paidCount}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Pending amount</p>
          <p className="mt-2 text-3xl font-bold">
            {pendingAmount.toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Sum across currencies; see individual records below.
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">
              All settlements ({settlements.length})
            </h2>
            <p className="text-sm text-gray-500">
              Pending settlements appear first.
            </p>
          </div>

          <button
            onClick={loadSettlements}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="text-gray-500">Loading settlements...</p>
        ) : settlements.length === 0 ? (
          <p className="text-gray-500">No settlements found.</p>
        ) : (
          <div className="space-y-4">
            {settlements.map((item) => (
              <article
                key={item.settlement_id}
                className="rounded-lg border border-gray-200 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-gray-500">
                      Settlement #{item.settlement_id}
                    </p>
                    <h3 className="mt-1 font-semibold">
                      {item.debtor_name} → {item.creditor_name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      {formatAmount(item.amount, item.currency)}
                    </p>
                  </div>

                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium capitalize">
                    {item.status}
                  </span>
                </div>

                <div className="mt-4 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
                  <p>
                    Period: {formatDate(item.period_start)} –{" "}
                    {formatDate(item.period_end)}
                  </p>
                  <p>Created by: {item.created_by_name}</p>
                  <p>
                    Settled at:{" "}
                    {item.settled_at
                      ? new Date(item.settled_at).toLocaleString()
                      : "Not settled"}
                  </p>
                </div>

                {item.status === "pending" && (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                    <button
                      disabled={updating === item.settlement_id}
                      onClick={() => updateStatus(item.settlement_id, "paid")}
                      className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
                    >
                      {updating === item.settlement_id
                        ? "Updating..."
                        : "Mark as paid"}
                    </button>

                    <button
                      disabled={updating === item.settlement_id}
                      onClick={() =>
                        updateStatus(item.settlement_id, "cancelled")
                      }
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel settlement
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
