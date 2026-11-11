"use client";

import { useCallback, useEffect, useState } from "react";

export default function AdminExchangeRatesPage() {
  const [programs, setPrograms] = useState([]);
  const [rates, setRates] = useState([]);
  const [fromProgramId, setFromProgramId] = useState("");
  const [toProgramId, setToProgramId] = useState("");
  const [rate, setRate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyRateId, setBusyRateId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadRates = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/rates", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load exchange rates");
      setPrograms(data.programs);
      setRates(data.rates);
      setFromProgramId((current) => current || String(data.programs[0]?.program_id || ""));
      setToProgramId((current) => current || String(data.programs[1]?.program_id || ""));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRates(); }, [loadRates]);

  async function saveRate(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromProgramId, toProgramId, rate }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save exchange rate");
      setMessage("Exchange rate saved and enabled.");
      setRate("");
      await loadRates();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function setRateActive(item) {
    setBusyRateId(String(item.exchange_rate_id));
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/rates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exchangeRateId: item.exchange_rate_id, active: !item.active }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update exchange rate");
      setMessage(`Exchange rate ${data.exchangeRate.active ? "enabled" : "disabled"}.`);
      await loadRates();
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setBusyRateId("");
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
      <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">Platform administration</p>
      <h1 className="mt-2 text-3xl font-bold text-zinc-900">Exchange rates</h1>
      <p className="mt-2 text-zinc-600">
        A rate tells how many destination points a customer receives for one source point.
      </p>

      {message && <p role="status" className="mt-6 rounded-lg bg-emerald-50 p-3 text-emerald-800">{message}</p>}
      {error && <p role="alert" className="mt-6 rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}

      <form onSubmit={saveRate} className="mt-6 grid gap-4 rounded-xl border border-zinc-200 bg-white p-5 md:grid-cols-4">
        <label className="text-sm font-medium text-zinc-700">
          Source program
          <select
            required
            value={fromProgramId}
            onChange={(event) => setFromProgramId(event.target.value)}
            className="mt-2 block w-full rounded-lg border border-zinc-300 px-3 py-2"
          >
            <option value="">Choose source</option>
            {programs.map((program) => (
              <option key={program.program_id} value={program.program_id}>
                {program.business_name} · {program.program_name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-zinc-700">
          Destination program
          <select
            required
            value={toProgramId}
            onChange={(event) => setToProgramId(event.target.value)}
            className="mt-2 block w-full rounded-lg border border-zinc-300 px-3 py-2"
          >
            <option value="">Choose destination</option>
            {programs.map((program) => (
              <option key={program.program_id} value={program.program_id}>
                {program.business_name} · {program.program_name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-zinc-700">
          Points received per source point
          <input
            required
            inputMode="decimal"
            pattern="(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,6})?"
            value={rate}
            onChange={(event) => setRate(event.target.value)}
            placeholder="e.g. 0.85"
            className="mt-2 block w-full rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>

        <button
          disabled={saving || loading || !programs.length || fromProgramId === toProgramId}
          className="self-end rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save rate"}
        </button>
        {fromProgramId && fromProgramId === toProgramId && (
          <p className="text-sm text-amber-700 md:col-span-4">Choose two different programs.</p>
        )}
      </form>

      <section className="mt-8 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 p-5">
          <h2 className="text-lg font-semibold text-zinc-900">Configured rates</h2>
        </div>
        {loading ? (
          <p className="p-5 text-zinc-600">Loading rates…</p>
        ) : rates.length === 0 ? (
          <p className="p-5 text-zinc-600">No exchange rates configured yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="p-3">From</th>
                  <th className="p-3">To</th>
                  <th className="p-3">Rate</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Updated</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {rates.map((item) => (
                  <tr key={item.exchange_rate_id} className="border-t border-zinc-100">
                    <td className="p-3">{item.from_merchant} · {item.from_program}</td>
                    <td className="p-3">{item.to_merchant} · {item.to_program}</td>
                    <td className="p-3">1 {item.from_points} → {item.rate} {item.to_points}</td>
                    <td className="p-3 capitalize">{item.active ? "Active" : "Inactive"}</td>
                    <td className="p-3 text-zinc-500">{new Date(item.updated_at).toLocaleString()}</td>
                    <td className="p-3">
                      <button
                        onClick={() => setRateActive(item)}
                        disabled={busyRateId === String(item.exchange_rate_id)}
                        className="rounded-md border border-zinc-300 px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                      >
                        {busyRateId === String(item.exchange_rate_id)
                          ? "Saving…"
                          : item.active ? "Disable" : "Enable"}
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
