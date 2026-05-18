import Link from "next/link";
import { NO_REFUND_POLICY_SUMMARY, NO_REFUND_POLICY_TITLE } from "@/lib/refundPolicy";

type RefundPolicyNoticeProps = {
  className?: string;
  compact?: boolean;
};

/** No returns / no refunds — shown at checkout and payment. */
export default function RefundPolicyNotice({
  className = "",
  compact = false,
}: RefundPolicyNoticeProps) {
  return (
    <div
      className={`rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 text-xs text-amber-950 ${className}`}
      role="note"
    >
      <p className="font-semibold text-amber-950">{NO_REFUND_POLICY_TITLE}</p>
      <p
        className={`mt-1 leading-relaxed text-amber-900/90 ${compact ? "line-clamp-3" : ""}`}
      >
        {NO_REFUND_POLICY_SUMMARY}
      </p>
      <Link
        href="/policies"
        className="mt-1.5 inline-block font-medium text-rose underline underline-offset-2 hover:text-rose/80"
      >
        Read full policy
      </Link>
    </div>
  );
}
