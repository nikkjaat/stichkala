/** User-facing text for order/payment API error codes. */
export function formatOrderApiError(
  error: string | undefined,
  message?: string
): string {
  if (message?.trim()) return message.trim();
  switch (error) {
    case "payment_verification_expired":
      return "This checkout window has expired. Please start again from the product page.";
    case "utr_or_screenshot_required":
      return "Please provide a UTR or a payment screenshot (at least one).";
    case "failure_screenshot_required":
      return "A screenshot is required for a failure report.";
    case "invalid_chat_total":
      return "Order total does not match the agreed price. Refresh and try again, or ask for a new offer in chat.";
    case "invalid_chat_checkout":
    case "chat_offer_invalid_or_used":
      return "This chat offer is no longer valid. Ask the shop for a new price link.";
    case "chat_offer_expired":
      return "This offer has expired. Ask the shop for a new price link.";
    case "chat_product_mismatch":
      return "This offer does not match the product. Use the latest offer in chat.";
    default:
      return error || "Could not complete your request. Please try again.";
  }
}
