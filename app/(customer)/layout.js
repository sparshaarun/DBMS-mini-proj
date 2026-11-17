"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "My Wallets", href: "/wallets" },
  { label: "Coupons", href: "/coupons" },
  { label: "Exchange Points", href: "/exchange" },
  { label: "Activity History", href: "/history" },
];

export default function CustomerLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    setLoggingOut(true);
    setError("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Unable to log out. Please try again.");
      }

      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err.message);
      setLoggingOut(false);
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <Link href="/dashboard" className="text-xl font-bold text-emerald-800">
            Loyalty Exchange
          </Link>

          <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">
            Customer Portal
          </span>
        </div>

        <nav className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-5 pb-4">
          {navItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-emerald-700 text-white"
                    : "text-zinc-700 hover:bg-emerald-50 hover:text-emerald-800"
                }`}
              >
                {item.label}
              </Link>
            );
          })}

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="ml-auto rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </nav>

        {error && (
          <p role="alert" className="mx-auto max-w-7xl px-5 pb-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </header>

      {children}
    </div>
  );
}
