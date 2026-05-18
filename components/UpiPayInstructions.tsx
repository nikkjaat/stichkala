"use client";

import { useCallback, useState } from "react";
import { FaCheck, FaCopy } from "react-icons/fa";
import { copyTextToClipboard } from "@/lib/copyToClipboard";

type UpiPayInstructionsProps = {
  upiId: string;
  amount: number;
  payeeName?: string;
  disabled?: boolean;
  className?: string;
  /** Smaller layout for chat message bubbles */
  compact?: boolean;
};

export default function UpiPayInstructions({
  upiId,
  amount,
  payeeName,
  disabled = false,
  className = "",
  compact = false,
}: UpiPayInstructionsProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const copyUpiId = useCallback(async () => {
    setCopyError(false);
    const ok = await copyTextToClipboard(upiId);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } else {
      setCopyError(true);
    }
  }, [upiId]);

  return (
    <div className={`space-y-3 ${className}`}>
      <div
        className={
          compact
            ? "rounded-lg border border-rose/30 bg-white/80 p-2.5"
            : "rounded-xl border-2 border-rose/25 bg-rose/5 p-4"
        }
      >
        <p
          className={
            compact
              ? "text-[10px] font-medium text-text-light uppercase tracking-wide mb-0.5"
              : "text-xs font-medium text-text-light uppercase tracking-wide mb-1"
          }
        >
          Pay to this UPI ID
        </p>
        <p
          className={
            compact
              ? "font-mono text-sm font-semibold text-text-dark break-all select-all"
              : "font-mono text-lg sm:text-xl font-semibold text-text-dark break-all select-all"
          }
          title="Tap and hold to select, then copy"
        >
          {upiId}
        </p>
        {payeeName ? (
          <p
            className={
              compact ? "text-[10px] text-text-light mt-0.5" : "text-xs text-text-light mt-1"
            }
          >
            {payeeName}
          </p>
        ) : null}
        <p
          className={
            compact
              ? "text-xs font-medium text-rose mt-1"
              : "text-sm font-medium text-rose mt-2"
          }
        >
          Amount: ₹{amount}
        </p>

        <button
          type="button"
          onClick={() => void copyUpiId()}
          disabled={disabled}
          className={
            compact
              ? "mt-2 w-full flex items-center justify-center gap-1.5 border border-gray-200 bg-white text-text-dark py-2 rounded-lg text-xs font-medium hover:bg-gray-50 disabled:opacity-40"
              : "mt-3 w-full flex items-center justify-center gap-2 border-2 border-gray-200 bg-white text-text-dark py-2.5 rounded-full text-sm font-medium hover:bg-gray-50 disabled:opacity-40"
          }
        >
          {copied ? (
            <FaCheck size={compact ? 12 : 14} className="text-green-600" />
          ) : (
            <FaCopy size={compact ? 12 : 14} />
          )}
          {copied ? "Copied!" : "Copy UPI ID"}
        </button>

        {copyError ? (
          <p className="mt-2 text-[10px] text-amber-900 bg-amber-50 rounded-lg px-2 py-1">
            Could not copy automatically. Select the UPI ID above and copy manually.
          </p>
        ) : null}
      </div>

      {!compact ? (
        <ol className="text-xs text-text-light space-y-1.5 list-decimal list-inside">
          <li>
            Tap <strong>Copy UPI ID</strong> (or select the ID above)
          </li>
          <li>Open your UPI app (GPay, PhonePe, Paytm, etc.)</li>
          <li>Paste or type the UPI ID on the pay / send screen</li>
          <li>
            Enter amount <strong>₹{amount}</strong> manually, then pay
          </li>
          <li>Return here and tap payment confirmation</li>
        </ol>
      ) : (
        <p className="text-[10px] text-text-light leading-snug">
          Copy the UPI ID, pay ₹{amount} in your UPI app, then tap payment confirmation
          below.
        </p>
      )}
    </div>
  );
}
