"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { ensureChatNotifyServiceWorker } from "@/lib/chatPushNotification";

const DISMISS_KEY = "sk_notify_banner_dismiss_session";

export default function BrowserNotifyBanner() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    if (typeof window === "undefined") return;
    if (pathname?.includes("/secure/admin/login")) {
      setVisible(false);
      return;
    }
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(DISMISS_KEY)) {
      setVisible(false);
      return;
    }
    if (!("Notification" in window)) {
      setVisible(false);
      return;
    }
    setVisible(Notification.permission === "default");
  }, [pathname]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onVis = () => refresh();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [refresh]);

  const onEnable = () => {
    if (!("Notification" in window)) return;
    setBusy(true);
    void Notification.requestPermission()
      .then(() => {
        if (Notification.permission === "granted") {
          return ensureChatNotifyServiceWorker();
        }
      })
      .finally(() => {
        setBusy(false);
        refresh();
        window.dispatchEvent(new Event("sk-permission-change"));
      });
  };

  const onDismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  if (!visible) return null;

  const insecure =
    typeof window !== "undefined" &&
    typeof window.isSecureContext === "boolean" &&
    !window.isSecureContext;

  return (
    <div
      className="fixed bottom-20 left-3 right-[5.5rem] z-[45] max-w-md sm:bottom-24 sm:left-4 sm:right-auto"
      role="region"
      aria-label="Browser notifications"
    >
      <div className="rounded-2xl border border-rose/30 bg-white/95 shadow-lg backdrop-blur-sm px-3 py-2.5 sm:px-4 sm:py-3 text-sm text-text-dark">
        <div className="flex gap-2 items-start">
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="font-medium text-text-dark leading-snug">
              Turn on message alerts
            </p>
            <p className="text-xs text-text-light mt-1 leading-relaxed">
              {insecure
                ? "Open this site over HTTPS (or use localhost) for chat alerts on your phone or laptop."
                : "Allow notifications so we can ping you for new chat replies when this tab is in the background."}
            </p>
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            className="p-1 rounded-full hover:bg-gray-100 shrink-0 text-text-light"
            onClick={onDismiss}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {!insecure ? (
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onEnable}
              className="rounded-full bg-rose px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-dark disabled:opacity-60"
            >
              {busy ? "…" : "Allow alerts"}
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-full border border-gray-200 px-3 py-1.5 text-xs text-text-light hover:bg-gray-50"
            >
              Not now
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
