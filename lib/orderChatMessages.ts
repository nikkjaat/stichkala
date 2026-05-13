/** Admin → visitor chat copy after an order is placed (UPI proof or paid online). */

export function orderReceivedChatBodyAgreed(orderNumber: string): string {
  return `We received your order ${orderNumber} at the agreed price. We will now verify the payment and confirm the same with you via email, message, and here as well. Thank you!`;
}

export function orderReceivedChatBodyStandard(orderNumber: string): string {
  return `We received your order ${orderNumber}. We will now verify the payment and confirm the same with you via email, message, and here as well. Thank you!`;
}

export function formatOrderStatusLabel(status: string): string {
  const s = String(status).replace(/-/g, " ");
  if (!s) return status;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function adminChatPaymentConfirmed(orderNumber: string): string {
  return [
    `Good news — we've confirmed your payment for order ${orderNumber}. Your order is now confirmed.`,
    ``,
    `Tap Track Order below to see your latest status anytime.`,
  ].join("\n");
}

export function adminChatPaymentRejected(orderNumber: string): string {
  return [
    `We couldn't verify your payment for order ${orderNumber}. Your order has been cancelled or left unpaid based on our review.`,
    `If you think this is a mistake, reply here with your UPI reference or proof.`,
    ``,
    `Tap Track Order below to see what we have on file for this order.`,
  ].join("\n");
}

export function adminChatOrderFieldsUpdated(parts: {
  orderNumber: string;
  status?: string;
  paymentStatus?: string;
  /** Pass `undefined` to omit; pass string (possibly empty) when tracking changed. */
  trackingNumber?: string;
}): string {
  const lines: string[] = [`Order ${parts.orderNumber} was updated:`];
  if (parts.status != null && parts.status !== "")
    lines.push(`• Status: ${formatOrderStatusLabel(parts.status)}`);
  if (parts.paymentStatus != null && parts.paymentStatus !== "")
    lines.push(`• Payment: ${parts.paymentStatus}`);
  if (parts.trackingNumber !== undefined) {
    const t = String(parts.trackingNumber).trim();
    lines.push(`• Tracking number: ${t || "—"}`);
  }
  lines.push(``, `Tap Track Order below for the latest status.`);
  return lines.join("\n");
}
