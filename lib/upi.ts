export type BuildUpiPaymentParams = {
  /** UPI VPA, e.g. merchant@ptyes */
  payeeAddress: string;
  /** Shown in payer's UPI app */
  payeeName: string;
  /** Decimal amount as string, e.g. "1299.00" */
  amount: string;
  currency?: string;
  /** Note / reference (many apps show this); keep short */
  transactionNote?: string;
};

/**
 * UPI deep link (NPCI). Opens GPay / PhonePe / Paytm etc. with payee and amount prefilled.
 * @see https://www.npci.org.in/what-we-do/upi/product-overview
 */
export function buildUpiPaymentUri(params: BuildUpiPaymentParams): string {
  const cu = params.currency ?? "INR";
  const q = new URLSearchParams({
    pa: params.payeeAddress.trim(),
    pn: params.payeeName.trim().slice(0, 50),
    am: params.amount,
    cu,
  });
  const tn = params.transactionNote?.trim();
  if (tn) {
    q.set("tn", tn.slice(0, 80));
  }
  return `upi://pay?${q.toString()}`;
}

export function formatUpiAmount(amount: number): string {
  return amount.toFixed(2);
}
