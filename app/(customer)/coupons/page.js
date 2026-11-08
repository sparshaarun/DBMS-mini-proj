"use client";

import { useCallback, useEffect, useState } from "react";

const categoryOptions = ["food", "shopping", "books", "travel", "other", "general"];

export default function CustomerCouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadCoupons = useCallback(async (queryText, selectedCategory) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (queryText.trim()) params.set("q", queryText.trim());
      if (selectedCategory) params.set("category", selectedCategory);
      const suffix = params.size ? `?${params.toString()}` : "";
      const response = await fetch(`/api/customer/coupons${suffix}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load coupons");
      setCoupons(data.coupons);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCoupons("", "");
  }, [loadCoupons]);

  async function performAction(coupon, action) {
    setBusyId(coupon.coupon_id);
    setError("");
    setMessage("");
    try {
      const endpoint = action === "claim"
        ? "/api/customer/coupons"
        : "/api/customer/coupons/redeem";
      const body = action === "claim"
        ? { couponId: coupon.coupon_id }
        : { userCouponId: coupon.user_coupon_id };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Unable to ${action} coupon`);
      setMessage(data.message);
      await loadCoupons(search, category);
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">Customer</p>
        <h1 className="mt-2 text-3xl font-bold text-zinc-900">Coupons</h1>
        <p className="mt-2 text-zinc-600">Find offers, claim one, then redeem it at the merchant.</p>
        <a href="/history" className="mt-4 inline-block text-sm font-medium text-emerald-800 hover:underline">
          View activity history
        </a>
      </div>

      <form
        className="mb-6 grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-[1fr_190px_auto]"
        onSubmit={(event) => { event.preventDefault(); loadCoupons(search, category); }}
      >
        <label className="sr-only" htmlFor="coupon-search">Search coupons</label>
        <input
          id="coupon-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search offers, merchants, or programs"
          maxLength={100}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
        />
        <label className="sr-only" htmlFor="coupon-category">Category</label>
        <select
          id="coupon-category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
        >
          <option value="">All categories</option>
          {categoryOptions.map((value) => (
            <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>
          ))}
        </select>
        <button className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800">
          Search
        </button>
      </form>

      {message && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-emerald-800">{message}</p>}
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
      {loading && <p className="text-zinc-600">Loading coupons…</p>}
      {!loading && !error && coupons.length === 0 && (
        <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-zinc-600">No matching active coupons.</p>
      )}

      {!loading && coupons.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {coupons.map((coupon) => {
            const claimed = Boolean(coupon.user_coupon_id);
            const redeemed = coupon.claim_status === "redeemed";
            const soldOut = coupon.max_claims !== null &&
              Number(coupon.claimed_count) >= Number(coupon.max_claims);
            return (
              <article key={coupon.coupon_id} className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="text-lg font-bold text-zinc-900">{coupon.title}</h2>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium capitalize text-emerald-800">
                      {coupon.category}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-700">{coupon.description}</p>
                  <p className="mt-3 text-sm text-zinc-600">{coupon.business_name} · {coupon.program_name}</p>
                  <p className="mt-1 text-sm text-zinc-500">Expires {new Date(`${coupon.expires_on}T00:00:00`).toLocaleDateString()}</p>
                  {coupon.max_claims !== null && (
                    <p className="mt-1 text-sm text-zinc-500">
                      {Math.max(0, Number(coupon.max_claims) - Number(coupon.claimed_count))} claims remaining
                    </p>
                  )}
                  {coupon.redemption_instructions && (
                    <p className="mt-3 rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700">
                      {coupon.redemption_instructions}
                    </p>
                  )}
                </div>
                <div className="mt-4">
                  {redeemed ? (
                    <span className="text-sm font-semibold text-zinc-500">Already redeemed</span>
                  ) : claimed ? (
                    <button
                      onClick={() => performAction(coupon, "redeem")}
                      disabled={busyId === coupon.coupon_id}
                      className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                    >
                      {busyId === coupon.coupon_id ? "Working…" : "Mark as redeemed"}
                    </button>
                  ) : (
                    <button
                      onClick={() => performAction(coupon, "claim")}
                      disabled={soldOut || busyId === coupon.coupon_id}
                      className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {soldOut ? "Fully claimed" : busyId === coupon.coupon_id ? "Working…" : "Claim coupon"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
