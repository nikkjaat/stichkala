import mongoose from "mongoose";

export interface IChatThread {
  clientId: string;
  productId?: mongoose.Types.ObjectId;
  productName?: string;
  /** Visitor display name (optional) */
  displayName?: string;
  /** Stable human-friendly visitor id (same for all threads of this clientId). */
  visitorPublicId?: string;
  lastMessageAt: Date;
  /** Razorpay + amount for admin-offered checkout (one active offer per thread) */
  payOfferToken?: string;
  payOfferRazorpayOrderId?: string;
  payOfferAmountRupees?: number;
  payOfferExpiresAt?: Date;
  payOfferProductId?: mongoose.Types.ObjectId;
  /** Catalog / list price when the offer was created (for orders & receipts). */
  payOfferListPriceRupees?: number;
  payOfferUsedAt?: Date;
  /** Latest product the visitor asked about (subject line). */
  lastEnquiredProductId?: mongoose.Types.ObjectId;
  lastEnquiredProductName?: string;
  /** Number of times the visitor sent a product link in this conversation. */
  productEnquiryCount?: number;
}

const ChatThreadSchema = new mongoose.Schema(
  {
    clientId: { type: String, required: true, index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    productName: String,
    displayName: String,
    visitorPublicId: { type: String, index: true, sparse: true },
    lastMessageAt: { type: Date, default: Date.now },
    payOfferToken: { type: String, index: true, sparse: true },
    payOfferRazorpayOrderId: String,
    payOfferAmountRupees: Number,
    payOfferExpiresAt: Date,
    payOfferProductId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    payOfferListPriceRupees: Number,
    payOfferUsedAt: Date,
    lastEnquiredProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
    lastEnquiredProductName: String,
    productEnquiryCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ChatThreadSchema.index({ clientId: 1, lastMessageAt: -1 });

if (mongoose.models.ChatThread) {
  delete mongoose.models.ChatThread;
}

export default mongoose.model<IChatThread>("ChatThread", ChatThreadSchema);
