/** Accept only URLs produced by our chat upload (Cloudinary handcrafted-gifts/chat). */
export function isCloudinaryChatAttachmentUrl(url: string): boolean {
  const raw = String(url ?? "").trim();
  if (!raw.startsWith("https://")) return false;
  try {
    const u = new URL(raw);
    if (!u.hostname.endsWith("res.cloudinary.com")) return false;
    return u.pathname.includes("/handcrafted-gifts/chat/");
  } catch {
    return false;
  }
}
