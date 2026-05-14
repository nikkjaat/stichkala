import Product from "@/models/Product";
import { extractProductIdFromChatUrl } from "@/lib/chatProductUrl";
import { serializeChatMessage } from "@/lib/chatMessageSerialize";

export type ChatProductPreview = {
  name: string;
  image?: string;
  basePrice: number;
};

/** Attach `productPreview` to serialized product_link rows (one batched Product query). */
export async function serializeMessagesWithProductPreviews(
  leanDocs: Array<Record<string, unknown>>
) {
  const productIds = new Set<string>();
  for (const m of leanDocs) {
    if (m.kind === "product_link") {
      const pid = extractProductIdFromChatUrl(String(m.body ?? ""));
      if (pid) productIds.add(pid);
    }
  }

  const previewById = new Map<string, ChatProductPreview>();
  if (productIds.size > 0) {
    const prods = await Product.find({
      _id: { $in: Array.from(productIds) },
    })
      .select("name images basePrice")
      .lean();
    for (const p of prods) {
      const id = String((p as { _id: unknown })._id);
      const imgs = (p as { images?: string[] }).images;
      previewById.set(id, {
        name: String((p as { name?: string }).name ?? "Product"),
        image: Array.isArray(imgs) && imgs[0] ? imgs[0] : undefined,
        basePrice: Number((p as { basePrice?: number }).basePrice) || 0,
      });
    }
  }

  return leanDocs.map((m) => {
    const row = serializeChatMessage(
      m as Parameters<typeof serializeChatMessage>[0]
    ) as Record<string, unknown>;
    if (m.kind === "product_link") {
      const pid = extractProductIdFromChatUrl(String(m.body ?? ""));
      const pv = pid ? previewById.get(pid) : undefined;
      if (pv) {
        return { ...row, productPreview: pv };
      }
    }
    return row;
  });
}
