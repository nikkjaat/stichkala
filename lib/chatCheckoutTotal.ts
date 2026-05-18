/** Gift wrap add-on (₹) — must match CustomizationModal.calculateTotal. */
export const GIFT_WRAP_FEE_RUPEES = 50;

/**
 * Validates negotiated chat checkout total: base = unit price × qty, optional +₹50 gift wrap.
 */
export function isValidNegotiatedChatTotal(
  totalAmount: number,
  unitPriceRupees: number,
  quantity: number
): boolean {
  if (!Number.isFinite(totalAmount) || totalAmount < 1) return false;
  const qty = Math.max(1, Math.floor(quantity) || 1);
  const baseLine = Math.round(unitPriceRupees * qty * 100) / 100;
  const extra = Math.round((totalAmount - baseLine) * 100) / 100;
  const epsilon = 0.02;
  return (
    Math.abs(extra) < epsilon ||
    Math.abs(extra - GIFT_WRAP_FEE_RUPEES) < epsilon
  );
}
