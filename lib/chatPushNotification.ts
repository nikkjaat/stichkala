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

export function showBrowserChatNotification(opts: {
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
  try {
    const notificationOpts: NotificationOptions & { vibrate?: number[] } = {
      body: body || "New message",
      tag: opts.tag ?? "stichkala-chat",
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
