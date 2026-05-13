/** Public profile (share / follow). */
export const INSTAGRAM_PROFILE_URL =
  process.env.NEXT_PUBLIC_INSTAGRAM_URL ??
  "https://www.instagram.com/vishakha_baliyan26?igsh=MXg3czd3YnBnbngzNg==";

/** Instagram handle without @ — used for https://ig.me/m/{username} (opens DM in app when possible). */
export const INSTAGRAM_USERNAME =
  process.env.NEXT_PUBLIC_INSTAGRAM_USERNAME ?? "vishakha_baliyan26";

export function getInstagramDmUrl(): string {
  return `https://ig.me/m/${INSTAGRAM_USERNAME}`;
}
