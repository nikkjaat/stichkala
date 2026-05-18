import Razorpay from "razorpay";

/** Public key for Razorpay Checkout (client). */
export function getRazorpayPublicKey(): string {
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim() || "";
}

export function isRazorpayConfigured(): boolean {
  return Boolean(
    process.env.RAZORPAY_KEY_ID?.trim() &&
      process.env.RAZORPAY_KEY_SECRET?.trim() &&
      getRazorpayPublicKey()
  );
}

/** Server-side Razorpay client; throws if keys are missing. */
export function createRazorpayClient(): Razorpay {
  const key_id = process.env.RAZORPAY_KEY_ID?.trim();
  const key_secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!key_id || !key_secret) {
    throw new Error("razorpay_not_configured");
  }
  return new Razorpay({ key_id, key_secret });
}
