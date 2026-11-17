import Link from "next/link";

const sections = [
  {
    title: "My Wallets",
    description: "View your loyalty points and balances across merchant programmes.",
    href: "/wallets",
    action: "View wallets",
  },
  {
    title: "Browse Coupons",
    description: "Discover offers from participating merchants and claim coupons.",
    href: "/coupons",
    action: "Explore coupons",
  },
  {
    title: "Exchange Points",
    description: "Transfer loyalty points between supported merchant programmes.",
    href: "/exchange",
    action: "Exchange points",
  },
  {
    title: "Activity History",
    description: "Review your recent point exchanges and coupon activity.",
    href: "/history",
    action: "View activity",
  },
];

export default function CustomerDashboard() {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10">
      <section className="rounded-2xl bg-emerald-800 px-7 py-10 text-white shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-200">
          Customer Dashboard
        </p>

        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
          Welcome to Loyalty Exchange
        </h1>

        <p className="mt-3 max-w-2xl text-emerald-100">
          Manage your loyalty wallets, discover merchant offers,
          exchange points and keep track of your activity in one place.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-zinc-900">
          What would you like to do?
        </h2>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {sections.map((section) => (
            <article
              key={section.href}
              className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <h3 className="text-lg font-bold text-zinc-900">
                {section.title}
              </h3>

              <p className="mt-2 min-h-12 text-sm leading-6 text-zinc-600">
                {section.description}
              </p>

              <Link
                href={section.href}
                className="mt-5 inline-flex rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                {section.action} →
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
