"use client";

import { useEffect, useState } from "react";

export default function AdminAuditPage() {
  const [events, setEvents] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [selectedType, setSelectedType] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadEvents() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ page: String(page) });
      if (selectedType) params.set("eventType", selectedType);

      const response = await fetch(`/api/admin/audit?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load audit logs");
      }

      setEvents(data.events || []);
      setEventTypes(data.eventTypes || []);
      setTotalPages(Math.max(1, data.totalPages || 1));
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, [page, selectedType]);

  function formatDate(value) {
    if (!value) return "Unknown date";
    return new Date(value).toLocaleString();
  }

  return (
    <main className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
          Platform administration
        </p>
        <h1 className="mt-2 text-3xl font-bold">Audit logs</h1>
        <p className="mt-2 text-gray-600">
          Review recorded activity across the platform.
        </p>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Activity history</h2>
            <p className="text-sm text-gray-500">{total} recorded events</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">All event types</option>
              {eventTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            <button
              onClick={loadEvents}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading audit events...</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : events.length === 0 ? (
          <p className="text-gray-500">No audit events found.</p>
        ) : (
          <div className="space-y-4">
            {events.map((event, index) => (
              <article
                key={`${event.eventType}-${event.timestamp}-${index}`}
                className="rounded-lg border border-gray-200 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">
                      {event.eventType?.replaceAll("_", " ") || "Unknown event"}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                      {formatDate(event.timestamp)}
                    </p>
                  </div>

                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                    {event.actor?.role || "System"}
                  </span>
                </div>

                <p className="mt-3 text-sm text-gray-600">
                  Actor ID: {event.actor?.userId ?? "N/A"}
                </p>

                {event.details && (
                  <pre className="mt-3 overflow-x-auto rounded-md bg-gray-50 p-3 text-xs text-gray-700">
                    {JSON.stringify(event.details, null, 2)}
                  </pre>
                )}
              </article>
            ))}
          </div>
        )}

        {!loading && !error && totalPages > 1 && (
          <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
