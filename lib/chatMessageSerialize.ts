/** Shared JSON shape for chat messages (user + admin APIs). */
export function serializeChatMessage(m: {
  _id: unknown;
  sender: string;
  kind: string;
  body: string;
  payToken?: string;
  orderNumber?: string;
  readAt?: Date | null;
  createdAt?: Date | null;
  offerProductName?: string;
  offerListPriceRupees?: number;
  offerRevisedPriceRupees?: number;
  offerProductId?: unknown;
}) {
  const base = {
    _id: String(m._id),
    sender: m.sender,
    kind: m.kind,
    body: m.body,
    readAt: m.readAt ?? null,
    createdAt: m.createdAt ?? null,
  };
  if (m.kind === "payment_cta" && m.payToken) {
    const o: Record<string, unknown> = { ...base, payToken: m.payToken };
    if (m.offerProductName != null && m.offerProductName !== "") {
      o.offerProductName = m.offerProductName;
    }
    if (typeof m.offerListPriceRupees === "number") {
      o.offerListPriceRupees = m.offerListPriceRupees;
    }
    if (typeof m.offerRevisedPriceRupees === "number") {
      o.offerRevisedPriceRupees = m.offerRevisedPriceRupees;
    }
    if (m.offerProductId) {
      o.offerProductId = String(m.offerProductId);
    }
    return o;
  }
  if (m.kind === "track_order") {
    const on = String(m.orderNumber ?? "").trim();
    if (on) return { ...base, orderNumber: on };
  }
  return base;
}
