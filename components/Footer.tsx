"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { registerProductPushForEmail } from "@/lib/productPushClient";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );
  const [pushBusy, setPushBusy] = useState(false);
  const [subscribedEmail, setSubscribedEmail] = useState<string | null>(null);
  const [pushAvailable, setPushAvailable] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setMsg({ type: "err", text: "Enter your email address." });
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const j = (await r.json()) as {
        success?: boolean;
        message?: string;
        error?: string;
        pushAvailable?: boolean;
      };
      if (!r.ok || !j.success) {
        setMsg({ type: "err", text: j.error || "Something went wrong." });
        return;
      }
      setMsg({ type: "ok", text: j.message || "You’re subscribed." });
      setSubscribedEmail(trimmed);
      setPushAvailable(Boolean(j.pushAvailable));
    } catch {
      setMsg({ type: "err", text: "Network error. Try again." });
    } finally {
      setBusy(false);
    }
  };

  const handleEnablePush = async () => {
    if (!subscribedEmail) return;
    setPushBusy(true);
    setMsg(null);
    try {
      const res = await registerProductPushForEmail(subscribedEmail);
      if (!res.ok) {
        setMsg({ type: "err", text: res.error });
        return;
      }
      setMsg({
        type: "ok",
        text: "Browser alerts are on — we’ll ping you when new products go live.",
      });
    } finally {
      setPushBusy(false);
    }
  };

  return (
    <footer className="bg-text-dark text-white py-12 px-6">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="font-serif text-2xl mb-4 text-rose">StichKalaa</h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              Creating beautiful, personalised pieces with love and care. Each
              item is a unique work of art made just for you.
            </p>
          </div>

          <div>
            <h4 className="font-serif text-lg mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>
                <Link
                  href="/products"
                  className="hover:text-rose transition-colors"
                >
                  Shop
                </Link>
              </li>
              <li>
                <Link
                  href="/products"
                  className="hover:text-rose transition-colors"
                >
                  Custom orders
                </Link>
              </li>
              <li>
                <Link href="/" className="hover:text-rose transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/#contact"
                  className="hover:text-rose transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif text-lg mb-4">New products</h4>
            <p className="text-gray-300 text-sm mb-4">
              Subscribe with your email to hear when we add new pieces.
              Optionally turn on browser alerts for instant notifications.
            </p>
            <form onSubmit={handleSubscribe} className="flex flex-col gap-2">
              <div className="flex gap-2 flex-col sm:flex-row">
                <input
                  type="email"
                  name="newsletter-email"
                  autoComplete="email"
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={busy}
                  className="flex-1 px-4 py-2 rounded-full bg-white bg-opacity-10 border border-white border-opacity-20 focus:outline-none focus:border-rose text-sm text-white placeholder:text-gray-400"
                />
                <motion.button
                  type="submit"
                  disabled={busy}
                  className="bg-rose px-6 py-2 rounded-full hover:bg-opacity-90 transition-colors text-sm font-medium disabled:opacity-50 shrink-0"
                  whileHover={{ scale: busy ? 1 : 1.02 }}
                  whileTap={{ scale: busy ? 1 : 0.98 }}
                >
                  {busy ? "…" : "Subscribe"}
                </motion.button>
              </div>
              {msg ? (
                <p
                  className={`text-xs ${
                    msg.type === "ok" ? "text-emerald-300" : "text-amber-200"
                  }`}
                >
                  {msg.text}
                </p>
              ) : null}
              {subscribedEmail && pushAvailable ? (
                <button
                  type="button"
                  onClick={() => void handleEnablePush()}
                  disabled={pushBusy}
                  className="text-left text-xs text-rose-200 hover:text-white underline underline-offset-2 disabled:opacity-50"
                >
                  {pushBusy
                    ? "Enabling alerts…"
                    : "Turn on browser alerts for new products"}
                </button>
              ) : null}
            </form>
          </div>
        </div>

        <div className="border-t border-white border-opacity-10 pt-8 text-center text-sm text-gray-400">
          <p>
            &copy; {new Date().getFullYear()} StichKalaa. Handmade with ❤️ in
            India
          </p>
        </div>
      </div>
    </footer>
  );
}
