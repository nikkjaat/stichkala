/**
 * Canonical public URL when `NEXT_PUBLIC_SITE_URL` is missing (emails, absolute links).
 * Update here if the primary deployment domain changes.
 */
export const DEFAULT_PUBLIC_SITE_URL = "https://vishakhabaliyan.vercel.app";

/** Origin only, no trailing slash — suitable for building absolute paths. */
export function getPublicSiteOrigin(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_SITE_URL || "")
    .trim()
    .replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return DEFAULT_PUBLIC_SITE_URL.replace(/\/$/, "");
}
