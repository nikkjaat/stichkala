import { CONTACT_EMAIL } from "@/lib/siteContact";

export const NO_REFUND_POLICY_TITLE = "No returns · No refunds";

export const NO_REFUND_POLICY_SUMMARY =
  "All orders are final. Because every piece is handmade and often personalised, we cannot accept returns, exchanges, or refunds once an order is placed or payment is confirmed.";

export type PolicySection = {
  heading: string;
  paragraphs: string[];
};

export const REFUND_POLICY_SECTIONS: PolicySection[] = [
  {
    heading: "All sales are final",
    paragraphs: [
      "By placing an order or completing payment on StichKalaa, you agree that your purchase is final. We do not offer returns, exchanges, or refunds under any circumstance, including change of mind, sizing preferences, or delays caused by courier partners.",
    ],
  },
  {
    heading: "Custom & personalised items",
    paragraphs: [
      "Many of our products are made to order or customised with names, dates, colours, or designs you approve. Once production begins, the item cannot be resold. For this reason, custom and personalised orders are strictly non-returnable and non-refundable.",
    ],
  },
  {
    heading: "Payment confirmation",
    paragraphs: [
      "Submitting payment (including UPI, Razorpay, or any other method we offer) confirms your acceptance of this policy. If payment fails or is reversed by your bank, your order may be cancelled; we do not owe a refund for amounts that were never successfully received.",
    ],
  },
  {
    heading: "Shipping & delivery",
    paragraphs: [
      "We pack orders carefully, but transit damage or loss must be reported to the courier using their process. StichKalaa is not responsible for refunds or replacements due to courier delays, failed delivery attempts, or incorrect addresses provided at checkout.",
    ],
  },
  {
    heading: "Order changes & cancellations",
    paragraphs: [
      "Please message us before payment if you need to change details. After payment is confirmed, we generally cannot cancel or modify your order. Any exception is at our sole discretion and does not set a precedent for future orders.",
    ],
  },
  {
    heading: "Questions",
    paragraphs: [
      `If you are unsure about colours, text, or sizing, contact us before ordering at ${CONTACT_EMAIL} or via Instagram. We are happy to help you choose — but once you pay, this no-return, no-refund policy applies.`,
    ],
  },
];

export const REFUND_POLICY_LAST_UPDATED = "May 2026";
