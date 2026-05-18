"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import UpiPayInstructions from "@/components/UpiPayInstructions";
import { PUBLIC_UPI_ID, PUBLIC_UPI_PAYEE_NAME } from "@/lib/upiConfig";

export type ChatProductDetail = {
  _id: string;
  name: string;
  description?: string;
  basePrice: number;
  images?: string[];
  category?: string;
  customizable?: boolean;
  inStock?: boolean;
  featured?: boolean;
  options?: {
    sizes?: string[];
    sizeUnit?: string;
    materials?: string[];
  };
};

type Negotiated = {
  amountRupees: number;
  listPriceRupees?: number;
  payToken: string;
  expiresAt: string;
};

export default function ChatProductDetailModal({
  open,
  productId,
  threadId,
  clientId,
  /** When true, negotiated price still shows but pay CTA is hidden (use chat offer). */
  hidePayCta = false,
  /** Opens customise + payment confirmation for negotiated UPI offer. */
  onNegotiatedUpiPay,
  onClose,
}: {
  open: boolean;
  productId: string | null;
  threadId: string | null;
  clientId: string | null;
  hidePayCta?: boolean;
  onNegotiatedUpiPay?: () => void;
  onClose: () => void;
}) {
  const [product, setProduct] = useState<ChatProductDetail | null>(null);
  const [negotiatedOffer, setNegotiatedOffer] = useState<Negotiated | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    if (!open || !productId) {
      setProduct(null);
      setNegotiatedOffer(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const q = new URLSearchParams();
        if (threadId && clientId) {
          q.set("threadId", threadId);
          q.set("clientId", clientId);
        }
        const qs = q.toString();
        const r = await fetch(
          `/api/products/${productId}${qs ? `?${qs}` : ""}`
        );
        const j = await r.json();
        if (cancelled) return;
        if (j.success && j.product) {
          setProduct(j.product);
          setNegotiatedOffer(j.negotiatedOffer ?? null);
          setImgIdx(0);
        } else {
          setProduct(null);
        }
      } catch {
        if (!cancelled) setProduct(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, productId, threadId, clientId]);

  if (!open) return null;

  const images = Array.isArray(product?.images) ? product!.images! : [];
  const mainImg = images[imgIdx] || images[0];

  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center bg-black/50 p-3 sm:p-4"
      role="dialog"
      aria-modal
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex justify-between items-center gap-2 p-4 border-b bg-white">
          <h3 className="font-serif text-lg text-text-dark truncate pr-2">
            {loading ? "Loading…" : product?.name || "Product"}
          </h3>
          <button
            type="button"
            aria-label="Close"
            className="p-2 rounded-full hover:bg-gray-100 shrink-0"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {loading && (
            <div className="py-12 text-center text-text-light text-sm">
              Loading product…
            </div>
          )}
          {!loading && !product && (
            <p className="text-sm text-red-600">Could not load this product.</p>
          )}
          {!loading && product && (
            <>
              {images.length > 0 && (
                <div className="space-y-2">
                  <div className="relative rounded-xl overflow-hidden bg-gray-100 aspect-[4/3]">
                    {mainImg && (
                      <Image
                        src={mainImg}
                        alt={product.name || "Product"}
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="(max-width: 480px) 100vw, 400px"
                      />
                    )}
                    {images.length > 1 && (
                      <>
                        <button
                          type="button"
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-1.5 shadow"
                          aria-label="Previous image"
                          onClick={() =>
                            setImgIdx((i) =>
                              i === 0 ? images.length - 1 : i - 1
                            )
                          }
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-1.5 shadow"
                          aria-label="Next image"
                          onClick={() =>
                            setImgIdx((i) =>
                              i === images.length - 1 ? 0 : i + 1
                            )
                          }
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                  {images.length > 1 && (
                    <div className="flex gap-1 flex-wrap justify-center">
                      {images.map((src, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setImgIdx(i)}
                          className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 ${
                            i === imgIdx ? "border-rose" : "border-transparent"
                          }`}
                        >
                          <Image
                            src={src}
                            alt=""
                            fill
                            unoptimized
                            className="object-cover"
                            sizes="48px"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2 items-baseline">
                {negotiatedOffer ? (
                  <>
                    <span className="text-text-light line-through text-sm">
                      ₹
                      {negotiatedOffer.listPriceRupees ??
                        product.basePrice}
                    </span>
                    <span className="text-rose font-bold text-2xl">
                      ₹{negotiatedOffer.amountRupees}
                    </span>
                    <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      Special price
                    </span>
                  </>
                ) : (
                  <span className="text-rose font-bold text-2xl">
                    ₹{product.basePrice}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 rounded-full bg-gray-100 capitalize">
                  {product.category}
                </span>
                {product.featured && (
                  <span className="px-2 py-1 rounded-full bg-rose/15 text-rose">
                    Featured
                  </span>
                )}
                <span
                  className={`px-2 py-1 rounded-full ${
                    product.inStock
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {product.inStock ? "In stock" : "Out of stock"}
                </span>
                {product.customizable && (
                  <span className="px-2 py-1 rounded-full bg-violet-100 text-violet-800">
                    Customizable
                  </span>
                )}
              </div>

              {product.description && (
                <div>
                  <p className="text-xs font-semibold text-text-dark mb-1">
                    Description
                  </p>
                  <p className="text-sm text-text-light whitespace-pre-wrap leading-relaxed">
                    {product.description}
                  </p>
                </div>
              )}

              {product.options &&
                (product.options.sizes?.length ||
                  product.options.materials?.length) && (
                  <div className="space-y-2 text-sm border-t pt-3">
                    <p className="text-xs font-semibold text-text-dark">
                      Options
                    </p>
                    {!!product.options.sizes?.length && (
                      <p className="text-text-light">
                        <span className="text-text-dark font-medium">Sizes: </span>
                        {product.options.sizes.join(", ")}
                        {product.options.sizeUnit
                          ? ` (${product.options.sizeUnit})`
                          : ""}
                      </p>
                    )}
                    {!!product.options.materials?.length && (
                      <p className="text-text-light">
                        <span className="text-text-dark font-medium">
                          Materials:{" "}
                        </span>
                        {product.options.materials.join(", ")}
                      </p>
                    )}
                  </div>
                )}

              {negotiatedOffer && !hidePayCta && onNegotiatedUpiPay && (
                <div className="rounded-xl border border-rose/30 bg-rose/5 p-4 space-y-3">
                  <p className="text-sm text-text-dark">
                    Agreed price{" "}
                    <strong>₹{negotiatedOffer.amountRupees}</strong>
                    {negotiatedOffer.listPriceRupees != null && (
                      <>
                        {" "}
                        <span className="text-text-light line-through text-xs">
                          (list ₹{negotiatedOffer.listPriceRupees})
                        </span>
                      </>
                    )}
                  </p>
                  <p className="text-[11px] text-text-light">
                    Offer valid until{" "}
                    {new Date(negotiatedOffer.expiresAt).toLocaleString("en-IN")}
                    .
                  </p>
                  <UpiPayInstructions
                    upiId={PUBLIC_UPI_ID}
                    amount={negotiatedOffer.amountRupees}
                    payeeName={PUBLIC_UPI_PAYEE_NAME}
                  />
                  <button
                    type="button"
                    onClick={onNegotiatedUpiPay}
                    className="block w-full text-center py-3 rounded-xl bg-rose text-white font-semibold text-sm hover:opacity-95"
                  >
                    Payment confirmation
                  </button>
                </div>
              )}
              {negotiatedOffer && hidePayCta && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-text-light">
                  Use <strong className="text-text-dark">Payment confirmation</strong>{" "}
                  in the chat offer to pay ₹{negotiatedOffer.amountRupees} via UPI.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
