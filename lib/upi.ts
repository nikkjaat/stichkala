export type BuildUpiPaymentParams = {
  /** UPI VPA, e.g. merchant@ptyes */
  payeeAddress: string;
  /** Must match the name registered with the bank for this VPA */
  payeeName: string;
  /** Amount in rupees */
  amount: number | string;
  currency?: string;
  /** Reference note, e.g. Order123 — alphanumeric only */
  transactionNote?: string;
  /** When true, amount is not prefilled (user enters in app) */
  omitAmount?: boolean;
};

/** NPCI amount — whole rupees without decimals; otherwise up to 2 decimals. */
export function formatUpiAmount(amount: number): string {
  const n = Math.max(1, Math.round(amount * 100) / 100);
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2);
}

/** Payee display name — ASCII only reduces rejections across UPI apps. */
export function sanitizeUpiPayeeName(name: string): string {
  return name
    .trim()
    .replace(/[^\w\s.&'-]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 50);
}

/** Spaces → %20 only (avoid encodeURIComponent — some UPI apps double-decode pn). */
export function formatPnForUpi(name: string): string {
  return sanitizeUpiPayeeName(name).replace(/ /g, "%20");
}

/** Alphanumeric transaction note (tn=Order123). */
export function sanitizeUpiTransactionNote(note: string): string {
  const cleaned = note.trim().replace(/[^a-zA-Z0-9]/g, "");
  return cleaned.slice(0, 40);
}

/** Opens UPI app — no payee or amount prefilled (iOS / desktop). */
export const GENERIC_UPI_APP_URI = "upi://";

/**
 * Android: system "Open with" chooser for all installed UPI apps.
 * No payment details in the URL — user enters UPI ID and amount manually.
 */
export function buildAndroidUpiChooserIntent(): string {
  return "intent://upi/#Intent;scheme=upi;end";
}

/** Best link for "Open in UPI app" on this device (call from client only). */
export function getGenericUpiAppOpenUri(): string {
  if (typeof navigator === "undefined") return GENERIC_UPI_APP_URI;
  if (/Android/i.test(navigator.userAgent)) {
    return buildAndroidUpiChooserIntent();
  }
  return GENERIC_UPI_APP_URI;
}

export function getUpiHandleHint(_vpa: string): string | null {
  return "Copy the UPI ID, choose your UPI app, then paste the ID and enter the amount manually.";
}

function validateVpa(vpa: string): void {
  if (!/^[\w.\-]+@[\w.\-]+$/i.test(vpa)) {
    throw new Error("Invalid UPI ID (VPA must look like name@bank)");
  }
}

function validateAmount(am: string): void {
  if (!/^\d+(\.\d{1,2})?$/.test(am)) {
    throw new Error("Invalid UPI amount");
  }
}

/**
 * NPCI UPI deep link — exact parameter order:
 * upi://pay?pa=upiid@bank&pn=Name&am=100&cu=INR&tn=Order123
 */
export function buildUpiPaymentUri(params: BuildUpiPaymentParams): string {
  const pa = params.payeeAddress.trim();
  const pn = formatPnForUpi(params.payeeName);
  const rawAmount =
    typeof params.amount === "number"
      ? params.amount
      : Number(String(params.amount).replace(/[^\d.]/g, ""));
  const am = formatUpiAmount(rawAmount);
  const cu = (params.currency ?? "INR").trim();

  validateVpa(pa);
  if (!pn) throw new Error("Invalid payee name");
  if (!params.omitAmount) validateAmount(am);

  const parts: string[] = [`pa=${pa}`, `pn=${pn}`];

  if (!params.omitAmount) {
    parts.push(`am=${am}`);
  }

  parts.push(`cu=${cu}`);

  const tn = params.transactionNote?.trim();
  if (tn) {
    const safeTn = sanitizeUpiTransactionNote(tn);
    if (safeTn) parts.push(`tn=${safeTn}`);
  }

  return `upi://pay?${parts.join("&")}`;
}

export type OpenUpiResult = "opened" | "unsupported";

/**
 * Prefer a real <a href={upiUri}> in JSX — browsers only reliably hand off
 * custom schemes from a direct user tap on an anchor.
 */
export function openUpiPaymentLink(upiUri: string): OpenUpiResult {
  if (typeof window === "undefined") return "unsupported";

  const a = document.createElement("a");
  a.href = upiUri;
  a.setAttribute("href", upiUri);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return "opened";
}

export function isLikelyMobileUpiDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}
