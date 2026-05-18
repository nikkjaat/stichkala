"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CHECKOUT_DRAFT_STORAGE_KEY,
  CHECKOUT_PROOF_WINDOW_MS,
  parseCheckoutDraft,
  type CheckoutDraftV1,
} from "@/lib/checkoutDraft";
import { formatOrderApiError } from "@/lib/orderErrorMessages";
import RefundPolicyNotice from "@/components/RefundPolicyNotice";

type Step = "question" | "form" | "failure" | "success";
type SuccessVariant = "paid" | "failure";

export default function PaymentPendingPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<CheckoutDraftV1 | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [step, setStep] = useState<Step>("question");
  const [successVariant, setSuccessVariant] = useState<SuccessVariant>("paid");
  const [utr, setUtr] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [failureFile, setFailureFile] = useState<File | null>(null);
  const [failureNote, setFailureNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  useEffect(() => {
    document.title = "Payment verification | StichKalaa";
  }, []);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CHECKOUT_DRAFT_STORAGE_KEY);
      const parsed = parseCheckoutDraft(raw);
      if (!parsed) {
        setLoadError("no_draft");
        return;
      }
      setDraft(parsed);
    } catch {
      setLoadError("no_draft");
    }
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const expiresAt = draft ? draft.draftStartedAt + CHECKOUT_PROOF_WINDOW_MS : 0;
  const expired = draft ? now > expiresAt : false;
  const secondsLeft = draft
    ? Math.max(0, Math.ceil((expiresAt - now) / 1000))
    : 0;

  const handleSubmitProof = async () => {
    if (!draft || expired) return;
    const u = utr.trim();
    const hasUtr = Boolean(u);
    const hasFile = Boolean(file);
    if (!hasUtr && !hasFile) {
      setSubmitError(
        "Please add at least a UTR / reference or a payment screenshot."
      );
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      let screenshotUrl = "";
      if (hasFile && file) {
        const fd = new FormData();
        fd.set("uploadType", "file");
        fd.set("file", file);
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        const upJson = await up.json();
        if (!up.ok || !upJson.success || !upJson.url) {
          setSubmitError(upJson.error || "Upload failed. Try a smaller image.");
          return;
        }
        screenshotUrl = upJson.url as string;
      }

      const payload: Record<string, unknown> = {
        customerInfo: draft.customerInfo,
        items: draft.items,
        totalAmount: draft.totalAmount,
        paymentMethod: "upi",
        paymentStatus: "pending",
        checkoutDraftStartedAt: draft.draftStartedAt,
      };
      if (hasUtr) payload.upiUtr = u;
      if (screenshotUrl) payload.paymentScreenshot = screenshotUrl;
      if (draft.chatClientId) {
        payload.chatClientId = draft.chatClientId;
      }
      if (draft.chatPayToken && draft.chatThreadId && draft.chatClientId) {
        payload.chatPayToken = draft.chatPayToken;
        payload.chatThreadId = draft.chatThreadId;
        if (typeof draft.chatListPriceRupees === "number") {
          payload.chatListPriceRupees = draft.chatListPriceRupees;
        }
      }

      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const orderJson = await orderRes.json();
      if (!orderRes.ok || !orderJson.success) {
        setSubmitError(
          orderJson.error === "payment_verification_expired"
            ? "This checkout window has expired. Please start again from the product page."
            : orderJson.error === "utr_or_screenshot_required"
              ? "Please provide a UTR or a screenshot (at least one)."
              : orderJson.error || "Could not create your order."
        );
        return;
      }

      sessionStorage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY);
      setOrderNumber(orderJson.order.orderNumber);
      setSuccessVariant("paid");
      setStep("success");
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitFailureReport = async () => {
    if (!draft || expired) return;
    if (!failureFile) {
      setSubmitError(
        "Please upload a screenshot (e.g. error or failed payment screen from your UPI app)."
      );
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const fd = new FormData();
      fd.set("uploadType", "file");
      fd.set("file", failureFile);
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      const upJson = await up.json();
      if (!up.ok || !upJson.success || !upJson.url) {
        setSubmitError(upJson.error || "Upload failed. Try a smaller image.");
        return;
      }

      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerInfo: draft.customerInfo,
          items: draft.items,
          totalAmount: draft.totalAmount,
          paymentMethod: "upi",
          paymentStatus: "pending",
          checkoutDraftStartedAt: draft.draftStartedAt,
          upiPaymentFailureReport: true,
          failureNote: failureNote.trim() || undefined,
          paymentScreenshot: upJson.url,
        }),
      });
      const orderJson = await orderRes.json();
      if (!orderRes.ok || !orderJson.success) {
        setSubmitError(
          formatOrderApiError(
            orderJson.error as string | undefined,
            orderJson.message as string | undefined
          )
        );
        return;
      }

      sessionStorage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY);
      setOrderNumber(orderJson.order.orderNumber);
      setSuccessVariant("failure");
      setStep("success");
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError === "no_draft") {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
        <h1 className="font-serif text-2xl text-text-dark mb-2">
          No pending checkout
        </h1>
        <p className="text-text-light text-sm mb-6 max-w-md">
          Open this page right after you tap <strong>PAY NOW</strong> on a
          product. If you closed the tab, go back to the shop and start again.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => router.back()}
            className="border-2 border-gray-200 text-text-dark px-6 py-3 rounded-full text-sm font-medium hover:bg-gray-50"
          >
            Back
          </button>
          <Link
            href="/"
            className="bg-rose text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-opacity-90 inline-block text-center"
          >
            Back to shop
          </Link>
        </div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-text-light text-sm">
        Loading…
      </div>
    );
  }

  if (step === "success" && orderNumber) {
    const isFailure = successVariant === "failure";
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-3xl border border-gray-100 shadow-lg p-8 text-center"
        >
          <div className="text-4xl mb-3">{isFailure ? "📩" : "✅"}</div>
          <h1 className="font-serif text-2xl text-text-dark mb-2">
            {isFailure ? "Report saved" : "Order created"}
          </h1>
          <p className="text-text-light text-sm mb-4">
            {isFailure
              ? "We received your payment failure details and screenshot. Our team will review and may contact you."
              : "Your order number is saved. We will verify your UPI payment manually. You will receive updates by email if you provided one."}
          </p>
          <p className="font-mono text-lg font-bold text-rose mb-6">
            {orderNumber}
          </p>
          <div className="space-y-3">
            {!isFailure && (
              <Link
                href={`/track?order=${encodeURIComponent(orderNumber)}`}
                className="block w-full bg-rose text-white py-3 rounded-full text-sm font-medium hover:bg-opacity-90"
              >
                Track your order
              </Link>
            )}
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(orderNumber)}
              className="w-full border-2 border-gray-200 py-3 rounded-full text-sm text-text-dark hover:bg-gray-50"
            >
              Copy reference number
            </button>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 border-2 border-gray-200 py-3 rounded-full text-sm font-medium text-text-dark hover:bg-gray-50"
              >
                Back
              </button>
              <Link
                href="/"
                className="flex-1 bg-gray-100 text-text-dark py-3 rounded-full text-sm font-medium hover:bg-gray-200 text-center"
              >
                Back to shop
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] max-w-lg mx-auto px-4 pt-24 pb-10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm font-medium text-text-dark hover:text-rose"
        >
          ← Back
        </button>
        <Link
          href="/"
          className="text-sm font-medium text-rose hover:underline"
        >
          Back to shop
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border-2 border-rose/30 p-6 sm:p-8 shadow-sm"
      >
        <p className="text-xs uppercase tracking-wide text-rose font-medium mb-1">
          UPI payment
        </p>
        <h1 className="font-serif text-2xl text-text-dark mb-2">
          Payment confirmation
        </h1>
        <RefundPolicyNotice className="mb-4" />

        <div className="mb-6 p-4 rounded-2xl bg-gray-50 border border-gray-100">
          <div className="flex gap-3 items-start min-w-0 mb-4">
            <div className="shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-gray-200 bg-white">
              <Image
                src={draft.productImage || "/logo.png"}
                alt={draft.productName}
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-dark line-clamp-2">
                {draft.productName}
              </p>
              <p className="text-lg font-semibold text-rose mt-1">
                ₹{draft.totalAmount}
              </p>
            </div>
          </div>

          <p className="text-sm text-text-light">
            Pay <strong className="text-text-dark">₹{draft.totalAmount}</strong> in your
            UPI app using the ID you copied, then confirm below.
          </p>
        </div>

        <div
          className={`rounded-xl px-3 py-2 text-sm mb-6 ${
            expired ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900"
          }`}
        >
          {expired ? (
            <span>
              The 10-minute window has ended. Please start checkout again from
              the product page.
            </span>
          ) : (
            <span>
              Time left to submit:{" "}
              <strong>
                {Math.floor(secondsLeft / 60)}:
                {String(secondsLeft % 60).padStart(2, "0")}
              </strong>
            </span>
          )}
        </div>

        {step === "question" && (
          <div className="space-y-4">
            <p className="text-text-dark font-medium">
              Did you complete the payment in your UPI app?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                disabled={expired}
                onClick={() => setStep("form")}
                className="bg-rose text-white py-3 rounded-full text-sm font-medium disabled:opacity-40"
              >
                Yes, I paid
              </button>
              <button
                type="button"
                disabled={expired}
                onClick={() => {
                  setSubmitError(null);
                  setStep("failure");
                }}
                className="border-2 border-red-200 bg-red-50 text-red-900 py-3 rounded-full text-sm font-medium hover:bg-red-100 disabled:opacity-40"
              >
                Payment failed
              </button>
            </div>
            <p className="text-xs text-text-light">
              After paying in your UPI app, confirm here. Use{" "}
              <strong>Payment failed</strong> if something went wrong.
            </p>
          </div>
        )}

        {expired && (
          <div className="mt-6 text-center">
            <Link href="/" className="text-rose text-sm font-medium underline">
              Start over from home
            </Link>
          </div>
        )}

        {step === "form" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-dark mb-1">
                UTR / bank reference (optional if you add a screenshot)
              </label>
              <input
                type="text"
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                placeholder="12-digit UTR or transaction ID"
                disabled={expired || submitting}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 focus:border-rose focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-dark mb-1">
                Payment screenshot (optional if you entered UTR)
              </label>
              <input
                type="file"
                accept="image/*"
                disabled={expired || submitting}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-text-light"
              />
            </div>
            <p className="text-xs text-amber-900 bg-amber-50 rounded-lg px-3 py-2">
              <strong>At least one</strong> of UTR or screenshot is required.
              Images are stored securely (Cloudinary).
            </p>
            {submitError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {submitError}
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                disabled={expired || submitting}
                onClick={() => setStep("question")}
                className="flex-1 border-2 border-gray-200 py-3 rounded-full text-sm font-medium"
              >
                Back
              </button>
              <button
                type="button"
                disabled={expired || submitting}
                onClick={() => void handleSubmitProof()}
                className="flex-1 bg-rose text-white py-3 rounded-full text-sm font-medium disabled:opacity-40"
              >
                {submitting ? "Submitting…" : "Confirm & create order"}
              </button>
            </div>
            <p className="text-xs text-text-light">
              Track anytime:{" "}
              <Link href="/track" className="text-rose underline">
                Track page
              </Link>
            </p>
          </div>
        )}

        {step === "failure" && (
          <div className="space-y-4">
            <p className="text-sm text-text-dark">
              Upload a <strong>screenshot</strong> showing what went wrong (UPI
              error, declined payment, bank message, etc.). Optional short note
              below.
            </p>
            <div>
              <label className="block text-sm font-medium text-text-dark mb-1">
                Screenshot (required) *
              </label>
              <input
                type="file"
                accept="image/*"
                disabled={expired || submitting}
                onChange={(e) => setFailureFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-text-light"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-dark mb-1">
                What happened? (optional)
              </label>
              <textarea
                value={failureNote}
                onChange={(e) => setFailureNote(e.target.value)}
                disabled={expired || submitting}
                rows={3}
                placeholder="e.g. App said transaction failed, money debited but order not updated…"
                className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 focus:border-rose focus:outline-none text-sm resize-none"
              />
            </div>
            {submitError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {submitError}
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                disabled={expired || submitting}
                onClick={() => {
                  setSubmitError(null);
                  setStep("question");
                }}
                className="flex-1 border-2 border-gray-200 py-3 rounded-full text-sm font-medium"
              >
                Back
              </button>
              <button
                type="button"
                disabled={expired || submitting}
                onClick={() => void handleSubmitFailureReport()}
                className="flex-1 bg-red-600 text-white py-3 rounded-full text-sm font-medium disabled:opacity-40 hover:bg-red-700"
              >
                {submitting ? "Submitting…" : "Submit failure report"}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
