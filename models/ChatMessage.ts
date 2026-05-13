import mongoose from "mongoose";

export type ChatMessageSender = "user" | "admin";
export type ChatMessageKind =
  | "text"
  | "product_link"
  | "payment_cta"
  | "track_order";

export interface IChatMessage {
  threadId: mongoose.Types.ObjectId;
  sender: ChatMessageSender;
  kind: ChatMessageKind;
  /** Plain text, product URL, or short label for payment bubble */
  body: string;
  /** For payment_cta — user opens /chat-pay/[payToken]; never show Razorpay ids in body */
  payToken?: string;
  /** For track_order — opens /track?order=… (no URL in body text). */
  orderNumber?: string;
  /** Shown with revise-price payment bubble */
  offerProductName?: string;
  offerListPriceRupees?: number;
  offerRevisedPriceRupees?: number;
  offerProductId?: mongoose.Types.ObjectId;
  /** Set when the other party has read this message (double tick). */
  readAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const ChatMessageSchema = new mongoose.Schema<IChatMessage>(
  {
    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatThread",
      required: true,
      index: true,
    },
    sender: { type: String, enum: ["user", "admin"], required: true },
    kind: {
      type: String,
      enum: ["text", "product_link", "payment_cta", "track_order"],
      default: "text",
    },
    body: { type: String, required: true },
    payToken: String,
    orderNumber: String,
    offerProductName: String,
    offerListPriceRupees: Number,
    offerRevisedPriceRupees: Number,
    offerProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
    readAt: Date,
  },
  { timestamps: true }
);

ChatMessageSchema.index({ threadId: 1, createdAt: 1 });

if (mongoose.models.ChatMessage) {
  delete mongoose.models.ChatMessage;
}

export default mongoose.model<IChatMessage>("ChatMessage", ChatMessageSchema);
