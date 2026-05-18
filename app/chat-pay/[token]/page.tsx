"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Script from "next/script";
import { motion } from "framer-motion";
import RefundPolicyNotice from "@/components/RefundPolicyNotice";
import { formatOrderApiError } from "@/lib/orderErrorMessages";

type Session = {
  amountRupees: number;
  listPriceRupees?: number;
  razorpayOrderId: string;
  keyId: string;
  productName: string;
};

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (r: { error?: { description?: string } }) => void) => void;
    };
  }
}

function waitForRazorpay(maxMs = 12000): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(true);
      return;
    }
    const start = Date.now();
    const tick = () => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      if (Date.now() - start > maxMs) {
        resolve(false);
        return;
      }
      window.setTimeout(tick, 80);
    };
    tick();
  });
}

export default function ChatPayPage() {
  const params = useParams();
  const token = decodeURIComponent(String(params?.token ?? ""));
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    pincode: "",
  });

  useEffect(() => {
    document.title = "Pay offer | StichKalaa";
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(
          `/api/chat/pay-session/${encodeURIComponent(token)}`
        );
        const j = await r.json();
        if (cancelled) return;
        if (!j.success) {
          setError(
            formatOrderApiError(
              j.error as string | undefined,
              j.message as string | undefined
            )
          );
          return;
        }
        if (!j.keyId?.trim()) {
          setError(
            "Online checkout is not configured. Use Pay — customise & UPI in chat instead."
          );
          return;
        }
        setSession({
          amountRupees: j.amountRupees,
          listPriceRupees: j.listPriceRupees,
          razorpayOrderId: j.razorpayOrderId,
          keyId: j.keyId,
          productName: j.productName,
        });
      } catch {
        if (!cancelled) setError("Network error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const pay = useCallback(async () => {
    if (!session?.keyId || !window.Razorpay) {
      setError("Payment script still loading — wait a moment and try again.");
      return;
    }
    const name = form.name.trim();
    const phone = form.phone.trim();
    const street = form.street.trim();
    const city = form.city.trim();
    const state = form.state.trim();
    const pincode = form.pincode.trim();
    if (!name || !phone || !street || !city || !state || !pincode) {
      setError("Please fill all required fields.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const rzp = new window.Razorpay({
        key: session.keyId,
        order_id: session.razorpayOrderId,
        name: "StichKalaa",
        description: session.productName,
        theme: { color: "#fb7185" },
        prefill: {
          name,
          email: form.email.trim() || undefined,
          contact: phone,
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const r = await fetch("/api/chat/pay-complete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                customerInfo: {
                  name,
                  email: form.email.trim(),
                  phone,
                  address: { street, city, state, pincode },
                },
              }),
            });
            const j = await r.json();
            if (!j.success) {
              setError(j.error || "Payment could not be recorded");
              setBusy(false);
              return;
            }
            setDone(j.orderNumber || "complete");
            setBusy(false);
          } catch {
            setError("Could not confirm payment on our server.");
            setBusy(false);
          }
        },
        modal: {
          ondismiss: () => setBusy(false),
        },
      });
      rzp.on("payment.failed", (resp) => {
        setBusy(false);
        setError(
          resp.error?.description ||
            "Payment failed or was cancelled. You can try again."
        );
      });
      rzp.open();
    } catch {
      setBusy(false);
      setError("Could not start Razorpay checkout.");
    }
  }, [session, form, token, razorpayReady]);

  if (done) {
    return (
      <main className="min-h-screen pt-24 px-4 bg-cream flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center space-y-4"
        >
          <h1 className="font-serif text-2xl text-text-dark">Thank you!</h1>
          <p className="text-text-light text-sm">
            Payment received. Your order number is{" "}
            <strong className="text-text-dark">{done}</strong>.
          </p>
          <Link
            href={`/track?order=${encodeURIComponent(done)}`}
            className="inline-block mt-2 px-6 py-3 rounded-full bg-rose text-white text-sm font-medium"
          >
            Track order
          </Link>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-24 pb-16 px-4 bg-cream">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-6 space-y-4">
        <h1 className="font-serif text-xl text-text-dark">Complete payment</h1>
        {session && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-text-dark">
              {session.productName}
            </p>
            <p className="text-sm text-text-light">
              {session.listPriceRupees != null &&
              session.listPriceRupees !== session.amountRupees ? (
                <>
                  <span className="line-through opacity-80">
                    ₹{session.listPriceRupees}
                  </span>
                  <span className="mx-1.5">→</span>
                  <span className="font-semibold text-text-dark">
                    ₹{session.amountRupees}
                  </span>
                  <span className="text-xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full ml-2">
                    Revised price
                  </span>
                </>
              ) : (
                <span className="font-semibold text-text-dark">
                  ₹{session.amountRupees}
                </span>
              )}
            </p>
          </div>
        )}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {!session && !error && (
          <p className="text-sm text-text-light">Loading…</p>
        )}
        {session && (
          <div className="space-y-3 text-sm">
            <input
              className="w-full border rounded-xl px-3 py-2"
              placeholder="Full name *"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <input
              className="w-full border rounded-xl px-3 py-2"
              placeholder="Phone *"
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: e.target.value }))
              }
            />
            <input
              className="w-full border rounded-xl px-3 py-2"
              placeholder="Email (optional)"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
            />
            <input
              className="w-full border rounded-xl px-3 py-2"
              placeholder="Street / house *"
              value={form.street}
              onChange={(e) =>
                setForm((f) => ({ ...f, street: e.target.value }))
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                className="w-full border rounded-xl px-3 py-2"
                placeholder="City *"
                value={form.city}
                onChange={(e) =>
                  setForm((f) => ({ ...f, city: e.target.value }))
                }
              />
              <input
                className="w-full border rounded-xl px-3 py-2"
                placeholder="State *"
                value={form.state}
                onChange={(e) =>
                  setForm((f) => ({ ...f, state: e.target.value }))
                }
              />
            </div>
            <input
              className="w-full border rounded-xl px-3 py-2"
              placeholder="PIN code *"
              value={form.pincode}
              onChange={(e) =>
                setForm((f) => ({ ...f, pincode: e.target.value }))
              }
            />
            <RefundPolicyNotice compact />
            <button
              type="button"
              disabled={busy}
              onClick={() => void pay()}
              className="w-full py-3 rounded-xl bg-rose text-white font-medium disabled:opacity-50"
            >
              {busy ? "Please wait…" : "Pay now"}
            </button>
            <p className="text-[11px] text-text-light text-center">
              You will complete payment securely with Razorpay. The raw payment
              link is never shown in chat — only here.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
