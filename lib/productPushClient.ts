/** Decode base64url (VAPID public key) to Uint8Array for PushManager.subscribe */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    out[i] = raw.charCodeAt(i);
  }
  return out;
}

export async function registerProductPushForEmail(
  email: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return { ok: false, error: "Browser alerts are not supported here." };
  }
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  if (!vapid) {
    return { ok: false, error: "Push is not set up on this site yet." };
  }

  const perm = await Notification.requestPermission();
  if (perm !== "granted") {
    return { ok: false, error: "Notification permission was not granted." };
  }

  const reg = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
  });
  await navigator.serviceWorker.ready;

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapid),
  });

  const r = await fetch("/api/subscribe/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      subscription: sub.toJSON(),
    }),
  });
  const j = (await r.json()) as { success?: boolean; error?: string };
  if (!r.ok || !j.success) {
    return { ok: false, error: j.error || "Could not enable alerts." };
  }
  return { ok: true };
}
