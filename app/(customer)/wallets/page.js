"use client";

import { useEffect, useState } from "react";

export default function WalletsPage() {
  const [wallets, setWallets] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWallets() {
      try {
        const response = await fetch("/api/customer/wallets", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load wallets");
        setWallets(data.wallets);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    }

    loadWallets();
  }, []);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">Customer</p>
          <h1 className="mt-2 text-3xl font-bold text-zinc-900">My wallets</h1>
          <p className="mt-2 text-zinc-600">See your points across merchant programs.</p>
        </div>
        <nav className="flex gap-4 text-sm font-medium text-emerald-800">
          <a href="/exchange" className="hover:underline">Exchange points</a>
          <a href="/history" className="hover:underline">Activity history</a>
        </nav>
      </div>

      {loading && <p className="text-zinc-600">Loading wallets…</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">{error}</p>}
      {!loading && !error && wallets.length === 0 && (
        <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-zinc-600">
          You do not have any loyalty wallets yet.
        </p>
      )}

      {!loading && !error && wallets.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {wallets.map((wallet) => (
            <article key={wallet.wallet_id} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-zinc-500">{wallet.business_name}</p>
              <h2 className="mt-1 text-xl font-semibold text-zinc-900">{wallet.program_name}</h2>
              <p className="mt-5 text-3xl font-bold text-emerald-800">
                {wallet.balance} <span className="text-base font-medium">{wallet.points_name}</span>
              </p>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
