/** Slug for ProductCategory.slug from admin-entered label. */
export function slugifyCategoryLabel(raw: string): string {
  const s = raw
    .toLowerCase()
    .trim()
    .replace(/#/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return s || "category";
}
