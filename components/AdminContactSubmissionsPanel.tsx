"use client";

import { useCallback, useEffect, useState } from "react";
import { FiMail, FiRefreshCw } from "react-icons/fi";

type Row = {
  _id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string | null;
};

function formatSubmittedAt(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
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

export default function AdminContactSubmissionsPanel({
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
      const r = await fetch("/api/admin/contact-submissions", {
        credentials: "include",
        cache: "no-store",
      });
      const j = (await r.json()) as {
        success?: boolean;
        submissions?: Row[];
        error?: string;
      };
      if (!r.ok || !j.success || !Array.isArray(j.submissions)) {
        setError(j.error || "Could not load submissions");
        setRows([]);
        return;
      }
      setRows(j.submissions);
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
    const id = window.setInterval(() => void load(), 25000);
    return () => window.clearInterval(id);
  }, [active, load]);

  if (!active) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-lg sm:text-xl text-text-dark">
            Contact form messages
          </h2>
          <p className="text-text-light text-sm mt-1 max-w-2xl">
            Submissions from the website contact page. Read-only — use email or
            phone to reply to the visitor.
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
          No submissions yet. They appear here when someone sends the contact
          form.
        </div>
      ) : (
        <ul className="space-y-4">
          {rows.map((s) => (
            <li
              key={s._id}
              className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-gray-100 pb-3 mb-3">
                <div className="flex items-start gap-2 min-w-0">
                  <FiMail
                    className="mt-0.5 shrink-0 text-rose"
                    size={18}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-text-dark truncate">
                      {s.name || "—"}
                    </p>
                    <a
                      href={`mailto:${s.email}`}
                      className="text-sm text-rose hover:underline break-all"
                    >
                      {s.email}
                    </a>
                  </div>
                </div>
                <time
                  className="shrink-0 text-xs text-text-light sm:text-sm"
                  dateTime={s.createdAt ?? undefined}
                >
                  {formatSubmittedAt(s.createdAt)}
                </time>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-light mb-1">
                Subject
              </p>
              <p className="text-sm text-text-dark mb-3">
                {s.subject?.trim() ? s.subject : "—"}
              </p>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-light mb-1">
                Message
              </p>
              <p className="text-sm text-text-dark whitespace-pre-wrap break-words">
                {s.message}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
