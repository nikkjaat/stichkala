import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import {
  NO_REFUND_POLICY_TITLE,
  REFUND_POLICY_LAST_UPDATED,
  REFUND_POLICY_SECTIONS,
} from "@/lib/refundPolicy";

export const metadata: Metadata = {
  title: "Returns & refunds policy | StichKalaa",
  description:
    "StichKalaa policy: all sales are final. No returns, exchanges, or refunds on handmade and personalised orders.",
};

export default function PoliciesPage() {
  return (
    <main className="min-h-screen pt-24 pb-16 bg-cream">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <Link
          href="/"
          className="text-sm text-rose hover:text-rose/80 font-medium mb-6 inline-block"
        >
          ← Back to shop
        </Link>

        <h1 className="font-serif text-3xl sm:text-4xl text-text-dark mb-2">
          {NO_REFUND_POLICY_TITLE}
        </h1>
        <p className="text-sm text-text-light mb-10">
          Last updated: {REFUND_POLICY_LAST_UPDATED}
        </p>

        <article className="bg-white rounded-3xl border border-rose/20 shadow-sm p-6 sm:p-10 space-y-8 text-text-dark mb-12">
          {REFUND_POLICY_SECTIONS.map((section) => (
            <section key={section.heading}>
              <h2 className="font-serif text-xl text-rose mb-3">
                {section.heading}
              </h2>
              <PolicySectionBody paragraphs={section.paragraphs} />
            </section>
          ))}
        </article>
      </div>

      <Footer />
    </main>
  );
}

function PolicySectionBody({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div className="space-y-3 text-sm sm:text-base leading-relaxed text-text-light">
      {paragraphs.map((text, i) => (
        <p key={i}>{text}</p>
      ))}
    </div>
  );
}
