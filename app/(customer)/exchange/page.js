"use client";

import { useEffect, useState } from "react";

export default function ExchangePage() {
  const [wallets, setWallets] = useState([]);
  const [fromWalletId, setFromWalletId] = useState("");
  const [toWalletId, setToWalletId] = useState("");
  const [points, setPoints] = useState("");
  const [preview, setPreview] = useState(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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

  async function handlePreview(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setPreview(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/customer/exchange/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromWalletId, toWalletId, points }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to preview this exchange");
      setPreview(data.preview);
    } catch (previewError) {
      setError(previewError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleExchange() {
    if (!preview?.hasEnoughPoints) return;

    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/customer/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromWalletId, toWalletId, points }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to complete this exchange");

      setSuccess(
        `${data.message}. ${data.pointsDebited} ${data.fromPointsName} exchanged for ` +
        `${data.pointsCredited} ${data.toPointsName}.`
      );
      setPreview(null);
      setPoints("");

      const walletResponse = await fetch("/api/customer/wallets", { cache: "no-store" });
      const walletData = await walletResponse.json();
      if (walletResponse.ok) setWallets(walletData.wallets);
    } catch (exchangeError) {
      setError(exchangeError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">Customer</p>
        <h1 className="mt-2 text-3xl font-bold text-zinc-900">Exchange points</h1>
        <p className="mt-2 text-zinc-600">Preview the exchange rate and point totals before confirming.</p>
      </div>

      {loading && <p className="text-zinc-600">Loading wallets…</p>}
      {success && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-4 text-emerald-900">{success}</p>}
      {!loading && error && wallets.length === 0 && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 p-4 text-red-800">{error}</p>
      )}
      {!loading && wallets.length < 2 && !error && (
        <p className="rounded-lg border border-zinc-200 bg-white p-4 text-zinc-700">
          You need at least two program wallets to exchange points.
        </p>
      )}

      {!loading && wallets.length >= 2 && (
        <form onSubmit={handlePreview} className="space-y-5 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <label className="block text-sm font-medium text-zinc-800">
            Exchange from
            <select required value={fromWalletId} onChange={(event) => {
              const nextWalletId = event.target.value;
              setFromWalletId(nextWalletId);
              if (String(toWalletId) === String(nextWalletId)) setToWalletId("");
              setPreview(null);
            }} className="mt-2 w-full rounded-lg border border-zinc-300 bg-white p-3">
              <option value="">Choose a wallet</option>
              {wallets.map((wallet) => (
                <option key={wallet.wallet_id} value={wallet.wallet_id}>
                  {wallet.business_name} · {wallet.program_name} ({wallet.balance} {wallet.points_name})
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-zinc-800">
            Exchange to
            <select required value={toWalletId} onChange={(event) => { setToWalletId(event.target.value); setPreview(null); }} className="mt-2 w-full rounded-lg border border-zinc-300 bg-white p-3">
              <option value="">Choose a wallet</option>
              {wallets.filter((wallet) => String(wallet.wallet_id) !== String(fromWalletId)).map((wallet) => (
                <option key={wallet.wallet_id} value={wallet.wallet_id}>
                  {wallet.business_name} · {wallet.program_name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-zinc-800">
            Points to exchange
            <input required type="number" min="1" step="1" value={points} onChange={(event) => { setPoints(event.target.value); setPreview(null); }} className="mt-2 w-full rounded-lg border border-zinc-300 p-3" />
          </label>

          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

          <button disabled={submitting} className="rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? "Calculating…" : "Preview exchange"}
          </button>

          {preview && (
            <section aria-live="polite" className="rounded-lg bg-emerald-50 p-4 text-emerald-950">
              <h2 className="font-semibold">Exchange preview</h2>
              <p className="mt-2">Spend {preview.pointsDebited} {preview.fromPointsName} from {preview.fromProgram}.</p>
              <p>Receive {preview.pointsCredited} {preview.toPointsName} in {preview.toProgram}.</p>
              <p className="mt-2 text-sm">Rate: 1 {preview.fromPointsName} = {preview.exchangeRate} {preview.toPointsName}</p>
              {!preview.hasEnoughPoints && (
                <p role="alert" className="mt-3 font-medium text-red-800">
                  Not enough points. Your source wallet has {preview.availablePoints} {preview.fromPointsName}.
                </p>
              )}
              {preview.hasEnoughPoints && (
                <button type="button" onClick={handleExchange} disabled={submitting} className="mt-4 rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">
                  {submitting ? "Exchanging…" : "Confirm exchange"}
                </button>
              )}
            </section>
          )}
        </form>
      )}

          <a href="/wallets" className="mt-6 inline-block text-sm font-medium text-emerald-800 hover:underline">
        Back to wallets
      </a>
    </main>
  );
}
