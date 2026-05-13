/** HttpOnly cookie used by middleware + POST /api/admin/session */

export const ADMIN_SESSION_COOKIE = "sk_admin_session";

function secretMaterial(): string {
  return (
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.ADMIN_PANEL_PASSWORD?.trim() ||
    "nikhil.123"
  );
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let v = 0;
  for (let i = 0; i < a.length; i++) {
    v |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return v === 0;
}

async function hmacSha256Hex(message: string): Promise<string> {
  const enc = new TextEncoder();
  const raw = enc.encode(secretMaterial().slice(0, 512));
  const key = await crypto.subtle.importKey(
    "raw",
    raw,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(message)
  );
  const bytes = new Uint8Array(sig);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

export async function mintSessionCookieValue(): Promise<string> {
  const exp = Date.now() + SESSION_MS;
  const mac = await hmacSha256Hex(String(exp));
  return `${exp}.${mac}`;
}

export async function verifySessionCookieValue(
  token: string | undefined
): Promise<boolean> {
  if (!token?.includes(".")) return false;
  const dot = token.indexOf(".");
  const expStr = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const expected = await hmacSha256Hex(expStr);
  return timingSafeEqualHex(mac, expected);
}

export function adminPasswordExpected(): string {
  return (
    process.env.ADMIN_PANEL_PASSWORD?.trim() || "nikhil.123"
  );
}
