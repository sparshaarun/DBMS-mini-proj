"use client";

import { useCallback, useEffect, useState } from "react";

const categories = ["food", "shopping", "books", "travel", "other", "general"];
const emptyForm = {
  title: "",
  description: "",
  category: "general",
  programId: "",
  maxClaims: "",
  expiresOn: "",
  redemptionInstructions: "",
};

export default function MerchantCouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/merchant/coupons", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load coupons");
      setCoupons(data.coupons || []);
      setPrograms(data.programs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCoupons(); }, [loadCoupons]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function startEdit(coupon) {
    setEditingId(coupon.coupon_id);
    setForm({
      title: coupon.title || "",
      description: coupon.description || "",
      category: coupon.category || "general",
      programId: String(coupon.program_id || ""),
      maxClaims: coupon.max_claims ?? "",
      expiresOn: coupon.expires_on ? String(coupon.expires_on).slice(0, 10) : "",
      redemptionInstructions: coupon.redemption_instructions || "",
    });
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function submitCoupon(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const body = editingId
        ? {
            title: form.title,
            description: form.description,
            category: form.category,
            maxClaims: form.maxClaims === "" ? null : Number(form.maxClaims),
            expiresOn: form.expiresOn,
            redemptionInstructions: form.redemptionInstructions,
          }
        : {
            ...form,
            programId: Number(form.programId),
            maxClaims: form.maxClaims === "" ? null : Number(form.maxClaims),
          };

      const response = await fetch(
        editingId ? `/api/merchant/coupons/${editingId}` : "/api/merchant/coupons",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save coupon");

      setMessage(data.message || (editingId ? "Coupon updated." : "Coupon created."));
      resetForm();
      await loadCoupons();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(coupon, status) {
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/merchant/coupons/${coupon.coupon_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update coupon status");
      setMessage(data.message || "Coupon status updated.");
      await loadCoupons();
    } catch (err) {
      setError(err.message);
    }
  }

  const visibleCoupons = coupons.filter((coupon) => filter === "all" || coupon.status === filter);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">Merchant portal</p>
        <h1 className="mt-2 text-3xl font-bold text-zinc-900">Coupon management</h1>
        <p className="mt-2 text-zinc-600">Create offers and manage the coupons available to customers.</p>
      </div>

      {message && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-emerald-800">{message}</p>}
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}

      <form onSubmit={submitCoupon} className="mb-8 space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-zinc-900">{editingId ? "Edit coupon" : "Create a coupon"}</h2>
          {editingId && <button type="button" onClick={resetForm} className="text-sm font-medium text-zinc-600 hover:underline">Cancel editing</button>}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-zinc-700">
            Coupon title *
            <input required name="title" maxLength={150} value={form.title} onChange={updateField} className="mt-1 w-full rounded-lg border border-zinc-300 p-3" />
          </label>
          <label className="text-sm font-medium text-zinc-700">
            Category *
            <select name="category" value={form.category} onChange={updateField} className="mt-1 w-full rounded-lg border border-zinc-300 bg-white p-3">
              {categories.map((category) => <option key={category} value={category}>{category[0].toUpperCase() + category.slice(1)}</option>)}
            </select>
          </label>
          {!editingId && (
            <label className="text-sm font-medium text-zinc-700">
              Loyalty program *
              <select required name="programId" value={form.programId} onChange={updateField} className="mt-1 w-full rounded-lg border border-zinc-300 bg-white p-3">
                <option value="">Choose a program</option>
                {programs.map((program) => <option key={program.program_id} value={program.program_id}>{program.program_name}</option>)}
              </select>
              <span className="mt-1 block text-xs text-zinc-500">Programs available to your business.</span>
            </label>
          )}
          <label className="text-sm font-medium text-zinc-700">
            Maximum claims
            <input type="number" min="1" step="1" name="maxClaims" value={form.maxClaims} onChange={updateField} placeholder="Leave blank for unlimited" className="mt-1 w-full rounded-lg border border-zinc-300 p-3" />
          </label>
          <label className="text-sm font-medium text-zinc-700">
            Expiry date *
            <input required type="date" name="expiresOn" value={form.expiresOn} onChange={updateField} className="mt-1 w-full rounded-lg border border-zinc-300 p-3" />
          </label>
        </div>

        <label className="block text-sm font-medium text-zinc-700">
          Description *
          <textarea required name="description" maxLength={1000} rows={3} value={form.description} onChange={updateField} className="mt-1 w-full rounded-lg border border-zinc-300 p-3" />
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          Redemption instructions
          <textarea name="redemptionInstructions" maxLength={1000} rows={2} value={form.redemptionInstructions} onChange={updateField} placeholder="Tell customers how to redeem this offer" className="mt-1 w-full rounded-lg border border-zinc-300 p-3" />
        </label>

        <button disabled={saving} className="rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
          {saving ? "Saving…" : editingId ? "Save changes" : "Create coupon"}
        </button>
      </form>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-zinc-900">Your coupons ({coupons.length})</h2>
        <select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {loading && <p className="text-zinc-600">Loading coupons…</p>}
      {!loading && visibleCoupons.length === 0 && <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-zinc-600">No coupons found for this filter.</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {visibleCoupons.map((coupon) => (
          <article key={coupon.coupon_id} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="font-semibold text-zinc-900">{coupon.title}</h3>
              <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${coupon.status === "active" ? "bg-emerald-50 text-emerald-800" : "bg-zinc-100 text-zinc-600"}`}>{coupon.status}</span>
            </div>
            <p className="mt-2 text-sm text-zinc-600">{coupon.description}</p>
            <p className="mt-3 text-sm text-zinc-500">{coupon.program_name} · {coupon.category}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <p><span className="text-zinc-500">Claims:</span> {coupon.claimed_count}{coupon.max_claims !== null ? ` / ${coupon.max_claims}` : ""}</p>
              <p><span className="text-zinc-500">Redeemed:</span> {coupon.redeemed_count}</p>
              <p className="col-span-2 text-zinc-500">Expires: {coupon.expires_on ? String(coupon.expires_on).slice(0, 10) : "—"}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => startEdit(coupon)} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Edit</button>
              {coupon.status === "active" ? (
                <button onClick={() => changeStatus(coupon, "inactive")} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50">Deactivate</button>
              ) : (
                <button onClick={() => changeStatus(coupon, "active")} className="rounded-lg border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50">Activate</button>
              )}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
