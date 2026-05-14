"use client";

import { useState, useEffect, useCallback } from "react";

/** True when the admin panel session cookie is valid (shop visitor is logged in as admin). */
export function useAdminSession() {
  const [authenticated, setAuthenticated] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/session", { cache: "no-store" });
      const j = (await r.json()) as { authenticated?: boolean };
      setAuthenticated(Boolean(j.authenticated));
    } catch {
      setAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  return { authenticated, refresh };
}
