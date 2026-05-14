import mongoose from "mongoose";

const PushKeysSchema = new mongoose.Schema(
  {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
  { _id: false }
);

/**
 * Browser Web Push endpoints for StichKalaa chat (visitor + admin devices).
 * One document per push endpoint; fields merge when the same browser registers
 * as visitor and/or admin.
 */
const ChatPushSubscriptionSchema = new mongoose.Schema(
  {
    endpoint: { type: String, required: true, unique: true, index: true },
    keys: { type: PushKeysSchema, required: true },
    /** Visitor chat client id — receives pushes when admin posts in any of their threads. */
    visitorClientId: { type: String, trim: true, index: true, default: "" },
    /** This browser is logged into admin and wants new-visitor-message pushes. */
    adminDevice: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

if (mongoose.models.ChatPushSubscription) {
  delete mongoose.models.ChatPushSubscription;
}

export default mongoose.model(
  "ChatPushSubscription",
  ChatPushSubscriptionSchema
);
