import webpush from "web-push";

let configured = false;

/** Returns true if VAPID keys are set and web-push is configured. */
export function configureWebPushIfPossible(): boolean {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const priv = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!pub || !priv) return false;
  const mail = (
    process.env.EMAIL_USER?.trim() || "stichkalaa@gmail.com"
  ).replace(/^mailto:/i, "");
  webpush.setVapidDetails(`mailto:${mail}`, pub, priv);
  configured = true;
  return true;
}

export { webpush };
