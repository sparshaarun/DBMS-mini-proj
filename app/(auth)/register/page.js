"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create account");
      router.push("/coupons");
      router.refresh();
    } catch (registerError) {
      setError(registerError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-5 py-12">
      <section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">Coupon Exchange</p>
        <h1 className="mt-3 text-3xl font-bold text-zinc-900">Create an account</h1>
        <p className="mt-2 text-sm text-zinc-600">Customer accounts can hold points and claim coupons.</p>

        <form onSubmit={handleRegister} className="mt-8 space-y-5">
          <label className="block text-sm font-medium text-zinc-700">
            Full name
            <input
              required
              maxLength={100}
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="mt-2 w-full rounded-lg border border-zinc-300 p-3"
            />
          </label>

          <label className="block text-sm font-medium text-zinc-700">
            Email address
            <input
              required
              type="email"
              maxLength={255}
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-lg border border-zinc-300 p-3"
            />
          </label>

          <label className="block text-sm font-medium text-zinc-700">
            Password
            <input
              required
              type="password"
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-lg border border-zinc-300 p-3"
            />
            <span className="mt-1 block text-xs font-normal text-zinc-500">Use at least 8 characters.</span>
          </label>

          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

          <button
            disabled={loading}
            className="w-full rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Create customer account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-600">
          Already registered? <Link href="/" className="font-semibold text-emerald-700 hover:underline">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
