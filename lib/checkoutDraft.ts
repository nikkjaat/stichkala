export const CHECKOUT_DRAFT_STORAGE_KEY = "stichkala_checkout_draft_v1";

/** Client clock when user tapped Pay — server enforces 10 min window from this. */
export type CheckoutDraftV1 = {
  version: 1;
  draftStartedAt: number;
  upiPayUri: string;
  /** Merchant VPA shown for copy-paste (e.g. name@ptyes). */
  upiId: string;
  productId: string;
  productName: string;
  productImage?: string;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    whatsappNumber: string;
    address: {
      street: string;
      city: string;
      state: string;
      pincode: string;
    };
  };
  items: Array<{
    productId: string;
    quantity: number;
    customization: Record<string, unknown>;
  }>;
  totalAmount: number;
  /** Browser visitor id — sent with UPI orders so we can post admin updates in chat (negotiated or not). */
  chatClientId?: string;
  /** When set with chatThreadId, server validates chat offer and marks it used after UPI order. */
  chatPayToken?: string;
  chatThreadId?: string;
  chatListPriceRupees?: number;
};

export const CHECKOUT_PROOF_WINDOW_MS = 10 * 60 * 1000;

export function parseCheckoutDraft(raw: string | null): CheckoutDraftV1 | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as CheckoutDraftV1;
    if (data?.version !== 1 || typeof data.draftStartedAt !== "number") {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}
