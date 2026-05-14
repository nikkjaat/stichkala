import { urlBase64ToUint8Array } from "@/lib/productPushClient";
import { getChatNotificationsEnabled } from "@/lib/chatPushNotification";

let lastVisitorSync = "";
let lastVisitorAt = 0;
let lastAdminAt = 0;

/** Register this browser for server Web Push when visitor chat alerts are on. */
export async function syncChatVisitorPushSubscription(
  clientId: string | null | undefined
): Promise<void> {
  const cid = String(clientId ?? "").trim();
  if (!cid) return;
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (!getChatNotificationsEnabled()) return;
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  if (!vapid || !("serviceWorker" in navigator)) return;

  const now = Date.now();
  if (cid === lastVisitorSync && now - lastVisitorAt < 4000) return;
  lastVisitorSync = cid;
  lastVisitorAt = now;

  try {
    const reg = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      });
    }
    const subscription = sub.toJSON();
    await fetch("/api/chat/push/register-visitor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: cid, subscription }),
      credentials: "same-origin",
    });
  } catch (e) {
    console.error("syncChatVisitorPushSubscription", e);
  }
}

/** Register this browser for admin chat pushes (requires admin session cookie). */
export async function syncChatAdminPushSubscription(): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (!getChatNotificationsEnabled()) return;
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  if (!vapid || !("serviceWorker" in navigator)) return;

  const now = Date.now();
  if (now - lastAdminAt < 4000) return;
  lastAdminAt = now;

  try {
    const reg = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      });
    }
    const subscription = sub.toJSON();
    await fetch("/api/chat/push/register-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription }),
      credentials: "include",
    });
  } catch (e) {
    console.error("syncChatAdminPushSubscription", e);
  }
}
