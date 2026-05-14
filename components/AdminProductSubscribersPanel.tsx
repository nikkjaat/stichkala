"use client";

import { useCallback, useEffect, useState } from "react";
import { FiMail, FiRefreshCw, FiBell, FiBellOff } from "react-icons/fi";

type Row = {
  _id: string;
  email: string;
  active: boolean;
  pushEnabled: boolean;
  createdAt: string | null;
};

function formatAt(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AdminProductSubscribersPanel({
  active,
}: {
  active: boolean;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await fetch("/api/admin/product-subscribers", {
        credentials: "include",
        cache: "no-store",
      });
      const j = (await r.json()) as {
        success?: boolean;
        subscribers?: Row[];
        error?: string;
      };
      if (!r.ok || !j.success || !Array.isArray(j.subscribers)) {
        setError(j.error || "Could not load subscribers");
        setRows([]);
        return;
      }
      setRows(j.subscribers);
    } catch {
      setError("Network error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    setLoading(true);
    void load();
    const id = window.setInterval(() => void load(), 30000);
    return () => window.clearInterval(id);
  }, [active, load]);

  if (!active) return null;

  const activeCount = rows.filter((r) => r.active).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-lg sm:text-xl text-text-dark">
            Newsletter subscribers
          </h2>
          <p className="text-text-light text-sm mt-1 max-w-2xl">
            Emails subscribed from the site footer for new product alerts.{" "}
            <span className="text-text-dark font-medium">
              {activeCount} active
            </span>
            {rows.length !== activeCount
              ? ` · ${rows.length} total rows`
              : rows.length
                ? ` · ${rows.length} total`
                : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void load();
          }}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-text-dark hover:bg-gray-50 disabled:opacity-50"
        >
          <FiRefreshCw
            className={loading ? "animate-spin" : ""}
            size={16}
            aria-hidden
          />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {loading && rows.length === 0 ? (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-rose border-t-transparent" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-text-light text-sm">
          No subscribers yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-text-light">
              <tr>
                <th className="px-4 py-3 sm:px-5">Email</th>
                <th className="px-4 py-3 sm:px-5 hidden sm:table-cell">Status</th>
                <th className="px-4 py-3 sm:px-5 hidden md:table-cell">Push</th>
                <th className="px-4 py-3 sm:px-5">Subscribed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((s) => (
                <tr key={s._id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3 sm:px-5">
                    <div className="flex items-center gap-2 min-w-0">
                      <FiMail className="shrink-0 text-rose" size={16} aria-hidden />
                      <a
                        href={`mailto:${s.email}`}
                        className="text-rose hover:underline break-all font-medium"
                      >
                        {s.email}
                      </a>
                    </div>
                    <div className="mt-1 flex gap-2 sm:hidden">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          s.active
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {s.active ? "Active" : "Unsubscribed"}
                      </span>
                      {s.pushEnabled ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-800">
                          <FiBell size={10} /> On
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 sm:px-5 hidden sm:table-cell">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        s.active
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {s.active ? "Active" : "Unsubscribed"}
                    </span>
                  </td>
                  <td className="px-4 py-3 sm:px-5 hidden md:table-cell text-text-dark">
                    {s.pushEnabled ? (
                      <span className="inline-flex items-center gap-1 text-violet-700">
                        <FiBell size={14} aria-hidden /> Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-text-light">
                        <FiBellOff size={14} aria-hidden /> No
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 sm:px-5 text-text-light whitespace-nowrap text-xs sm:text-sm">
                    <time dateTime={s.createdAt ?? undefined}>
                      {formatAt(s.createdAt)}
                    </time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
