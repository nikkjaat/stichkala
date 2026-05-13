import { getPublicSiteOrigin } from "@/lib/siteUrl";

export function buildProductPublicUrl(productId: string): string {
  const origin = getPublicSiteOrigin();
  return `${origin}/products?product=${encodeURIComponent(productId)}`;
}

/** Parse Mongo ObjectId from our public product URL (?product=). */
export function extractProductIdFromChatUrl(url: string): string | null {
  const raw = String(url ?? "").trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const q = u.searchParams.get("product");
    if (q && /^[a-f\d]{24}$/i.test(q)) return q;
  } catch {
    const m = raw.match(/[?&]product=([a-f\d]{24})/i);
    if (m) return m[1];
  }
  return null;
}
