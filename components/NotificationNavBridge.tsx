"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const SW_MSG = "sk-notification-navigate";

function navigateFromNotificationUrl(router: ReturnType<typeof useRouter>, raw: string) {
  let u: URL;
  try {
    u = new URL(raw, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  } catch {
    return;
  }
  if (typeof window === "undefined") return;

  const thread = u.searchParams.get("sk_chat_thread")?.trim();
  if (thread) {
    const focusReply = u.searchParams.get("sk_notif_reply") === "1";
    window.dispatchEvent(
      new CustomEvent("sk-open-visitor-chat", {
        detail: { threadId: thread, focusReply },
      })
    );
    return;
  }

  const path = u.pathname + u.search;
  if (path.includes("/secure/admin/vishakha")) {
    router.push(path);
    return;
  }
  if (u.pathname === "/products" && u.searchParams.get("product")?.trim()) {
    router.push(path);
    return;
  }

  if (path && path !== window.location.pathname + window.location.search) {
    router.push(path);
  }
}

/**
 * When the user taps a notification while a tab is already open, the service
 * worker posts the target URL here so we can open chat / admin / product UI
 * without a full reload.
 */
export default function NotificationNavBridge() {
  const router = useRouter();

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const d = event.data as { type?: string; url?: string } | null;
      if (!d || d.type !== SW_MSG || typeof d.url !== "string") return;
      navigateFromNotificationUrl(router, d.url);
    };
    const sw = navigator.serviceWorker;
    if (!sw?.addEventListener) return;
    sw.addEventListener("message", handler);
    return () => sw.removeEventListener("message", handler);
  }, [router]);

  return null;
}
