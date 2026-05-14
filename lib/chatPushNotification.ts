/** One-line preview for system / browser notifications (user + admin). */
export function formatChatMessageNotificationBody(m: {
  kind?: string;
  body?: string;
  fileName?: string;
  offerProductName?: string;
  orderNumber?: string;
}): string {
  const kind = String(m.kind ?? "text");
  switch (kind) {
    case "image":
      return "Sent a photo";
    case "file":
      return m.fileName
        ? `File: ${String(m.fileName).slice(0, 80)}`
        : "Sent a file";
    case "product_link":
      return "Shared a product link";
    case "payment_cta":
      return m.offerProductName
        ? `Offer: ${String(m.offerProductName).slice(0, 80)}`
        : "Revised price / pay link";
    case "track_order":
      return m.orderNumber
        ? `Order update · #${String(m.orderNumber).slice(0, 32)}`
        : String(m.body ?? "Order update").replace(/\s+/g, " ").trim().slice(0, 160);
    default:
      return String(m.body ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 220);
  }
}

/** Visitor: notify when chat panel is closed, or tab/app is in background. */
export function shouldNotifyVisitorChat(params: {
  panelOpen: boolean;
}): boolean {
  if (typeof document === "undefined") return false;
  if (document.hidden) return true;
  if (document.visibilityState === "hidden") return true;
  if (!params.panelOpen) return true;
  return false;
}

/** Admin: notify when not on Chats tab, or tab is in background. */
export function shouldNotifyAdminChat(params: {
  chatsTabActive: boolean;
}): boolean {
  if (typeof document === "undefined") return false;
  if (document.hidden) return true;
  if (document.visibilityState === "hidden") return true;
  if (!params.chatsTabActive) return true;
  return false;
}

/** User/admin can turn chat desktop notifications off without revoking browser permission. */
const CHAT_NOTIF_ENABLED_KEY = "sk_chat_notif_enabled";

export function getChatNotificationsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(CHAT_NOTIF_ENABLED_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setChatNotificationsEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHAT_NOTIF_ENABLED_KEY, enabled ? "1" : "0");
    window.dispatchEvent(new Event("sk-chat-notif-pref"));
  } catch {
    /* ignore */
  }
}

/** Same SW as product push — used so chat alerts use OS / shade notifications (esp. Android). */
async function getChatNotifyServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  try {
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
    }
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

/**
 * Register `/sw.js` after notification permission is granted so chat alerts
 * can use `registration.showNotification` (system tray / lock screen on many
 * phones), not only the page `Notification` constructor.
 */
export async function ensureChatNotifyServiceWorker(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return false;
  }
  const reg = await getChatNotifyServiceWorkerRegistration();
  return reg != null;
}

function notifyIconUrl(): string | undefined {
  try {
    return new URL("/next.svg", window.location.origin).href;
  } catch {
    return undefined;
  }
}

function showBrowserChatNotificationLegacy(opts: {
  title: string;
  body: string;
  tag?: string;
}): void {
  if (typeof window === "undefined") return;
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }
  const body = String(opts.body ?? "").trim().slice(0, 240);
  const title = String(opts.title ?? "Message").trim().slice(0, 80);
  const icon = notifyIconUrl();
  try {
    const notificationOpts: NotificationOptions & { vibrate?: number[] } = {
      body: body || "New message",
      tag: opts.tag ?? "stichkala-chat",
      icon,
      badge: icon,
      silent: false,
      requireInteraction: false,
      vibrate: [180, 80, 180],
    };
    const n = new Notification(title, notificationOpts);
    n.onclick = () => {
      try {
        window.focus();
      } catch {
        /* ignore */
      }
      n.close();
    };
  } catch {
    /* ignore */
  }
}

async function showBrowserChatNotificationAsync(opts: {
  title: string;
  body: string;
  tag?: string;
}): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }
  const body = String(opts.body ?? "").trim().slice(0, 240);
  const title = String(opts.title ?? "Message").trim().slice(0, 80);
  const tag = opts.tag ?? "stichkala-chat";
  const icon = notifyIconUrl();
  let openUrl: string;
  try {
    openUrl = window.location.href;
  } catch {
    openUrl = "/";
  }

  const reg = await getChatNotifyServiceWorkerRegistration();
  if (reg) {
    try {
      await reg.showNotification(title, {
        body: body || "New message",
        tag,
        icon: icon ?? "/next.svg",
        badge: icon ?? "/next.svg",
        silent: false,
        requireInteraction: false,
        renotify: true,
        vibrate: [180, 80, 180],
        data: { url: openUrl },
      });
      return;
    } catch {
      /* fall through to legacy */
    }
  }
  showBrowserChatNotificationLegacy(opts);
}

export function showBrowserChatNotification(opts: {
  title: string;
  body: string;
  tag?: string;
}): void {
  void showBrowserChatNotificationAsync(opts);
}

/** Chat-only: respects Alerts On/Off in the chat UI (localStorage). */
export function showChatBrowserNotification(opts: {
  title: string;
  body: string;
  tag?: string;
}): void {
  if (!getChatNotificationsEnabled()) return;
  showBrowserChatNotification(opts);
}

/**
 * Call from a **direct user click** (same synchronous turn as the click) so
 * mobile/desktop browsers tie the gesture to permission (especially Safari).
 */
export function requestChatNotificationsFromUserGesture(): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "granted") {
    void ensureChatNotifyServiceWorker();
    return;
  }
  if (Notification.permission !== "default") return;
  void Notification.requestPermission().then((p) => {
    if (p === "granted") void ensureChatNotifyServiceWorker();
  });
}
